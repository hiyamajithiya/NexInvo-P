from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from django.utils import timezone
from datetime import date, timedelta, datetime
from decimal import Decimal
import logging

logger = logging.getLogger(__name__)


# =============================================================================
# PAYMENT SETTINGS & PAYMENT REQUEST ENDPOINTS
# =============================================================================

@api_view(['GET', 'PUT'])
@permission_classes([IsAuthenticated])
def superadmin_payment_settings(request):
    """
    Get or update payment/bank account settings (SuperAdmin only)
    """
    if not request.user.is_superuser:
        return Response({'error': 'SuperAdmin access required'}, status=status.HTTP_403_FORBIDDEN)

    from .models import PaymentSettings

    if request.method == 'GET':
        try:
            settings = PaymentSettings.objects.filter(is_active=True).first()
            if not settings:
                return Response({'settings': None})

            return Response({
                'settings': {
                    'id': settings.id,
                    'account_holder_name': settings.account_holder_name,
                    'account_number': settings.account_number,
                    'bank_name': settings.bank_name,
                    'branch_name': settings.branch_name,
                    'ifsc_code': settings.ifsc_code,
                    'upi_id': settings.upi_id,
                    'upi_qr_code': settings.upi_qr_code,
                    'payment_instructions': settings.payment_instructions,
                    'is_active': settings.is_active,
                    'updated_at': settings.updated_at.isoformat(),
                }
            })
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    elif request.method == 'PUT':
        data = request.data

        # Validate required fields
        required_fields = ['account_holder_name', 'account_number', 'bank_name', 'ifsc_code']
        for field in required_fields:
            if not data.get(field):
                return Response({'error': f'{field} is required'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            # Get or create payment settings (only one record)
            settings, created = PaymentSettings.objects.get_or_create(
                is_active=True,
                defaults={
                    'account_holder_name': data.get('account_holder_name'),
                    'account_number': data.get('account_number'),
                    'bank_name': data.get('bank_name'),
                    'branch_name': data.get('branch_name', ''),
                    'ifsc_code': data.get('ifsc_code'),
                    'upi_id': data.get('upi_id', ''),
                    'upi_qr_code': data.get('upi_qr_code', ''),
                    'payment_instructions': data.get('payment_instructions', ''),
                }
            )

            if not created:
                settings.account_holder_name = data.get('account_holder_name', settings.account_holder_name)
                settings.account_number = data.get('account_number', settings.account_number)
                settings.bank_name = data.get('bank_name', settings.bank_name)
                settings.branch_name = data.get('branch_name', settings.branch_name)
                settings.ifsc_code = data.get('ifsc_code', settings.ifsc_code)
                settings.upi_id = data.get('upi_id', settings.upi_id)
                settings.upi_qr_code = data.get('upi_qr_code', settings.upi_qr_code)
                settings.payment_instructions = data.get('payment_instructions', settings.payment_instructions)
                settings.save()

            return Response({
                'success': True,
                'message': 'Payment settings saved successfully',
                'settings': {
                    'id': settings.id,
                    'account_holder_name': settings.account_holder_name,
                    'account_number': settings.account_number,
                    'bank_name': settings.bank_name,
                    'branch_name': settings.branch_name,
                    'ifsc_code': settings.ifsc_code,
                    'upi_id': settings.upi_id,
                    'payment_instructions': settings.payment_instructions,
                }
            })
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_payment_settings_public(request):
    """
    Get payment settings for tenants (public endpoint for subscription page)
    Only returns bank details, not admin-only fields
    """
    from .models import PaymentSettings

    try:
        settings = PaymentSettings.objects.filter(is_active=True).first()
        if not settings:
            return Response({'settings': None, 'message': 'Payment settings not configured'})

        return Response({
            'settings': {
                'account_holder_name': settings.account_holder_name,
                'account_number': settings.account_number,
                'bank_name': settings.bank_name,
                'branch_name': settings.branch_name,
                'ifsc_code': settings.ifsc_code,
                'upi_id': settings.upi_id,
                'upi_qr_code': settings.upi_qr_code,
                'payment_instructions': settings.payment_instructions,
            }
        })
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def submit_payment_request(request):
    """
    Submit a payment request for subscription (Tenant endpoint)
    """
    from .models import PaymentRequest, SubscriptionPlan, Coupon, OrganizationMembership, SuperAdminNotification

    data = request.data

    # Get organization from membership
    membership = OrganizationMembership.objects.filter(
        user=request.user,
        is_active=True
    ).first()

    if not membership:
        return Response({'error': 'No organization found for user'}, status=status.HTTP_400_BAD_REQUEST)

    organization = membership.organization

    # Validate required fields
    final_amount = float(data.get('final_amount', 0))

    # For free upgrades (amount = 0), transaction_id and payment details are not required
    if final_amount > 0:
        required_fields = ['plan_id', 'transaction_id', 'payment_date', 'payment_method', 'final_amount']
    else:
        required_fields = ['plan_id', 'final_amount']

    for field in required_fields:
        if field == 'final_amount':
            continue  # Already validated above
        if not data.get(field):
            return Response({'error': f'{field} is required'}, status=status.HTTP_400_BAD_REQUEST)

    # Get plan
    try:
        plan = SubscriptionPlan.objects.get(id=data.get('plan_id'), is_active=True)
    except SubscriptionPlan.DoesNotExist:
        return Response({'error': 'Invalid plan'}, status=status.HTTP_400_BAD_REQUEST)

    # Check for pending requests
    existing_pending = PaymentRequest.objects.filter(
        organization=organization,
        status='pending'
    ).exists()

    if existing_pending:
        return Response({
            'error': 'You already have a pending payment request. Please wait for approval or contact support.'
        }, status=status.HTTP_400_BAD_REQUEST)

    # Handle coupon if provided
    coupon = None
    discount_amount = 0
    if data.get('coupon_code'):
        try:
            coupon = Coupon.objects.get(code=data.get('coupon_code').upper())
            can_redeem, message = coupon.can_redeem(organization)
            if not can_redeem:
                return Response({'error': message}, status=status.HTTP_400_BAD_REQUEST)
            discount_amount = data.get('discount_amount', 0)
        except Coupon.DoesNotExist:
            return Response({'error': 'Invalid coupon code'}, status=status.HTTP_400_BAD_REQUEST)

    try:
        # Parse payment date (use today's date for free upgrades if not provided)
        from datetime import datetime, date
        if data.get('payment_date'):
            payment_date = datetime.strptime(data.get('payment_date'), '%Y-%m-%d').date()
        else:
            payment_date = date.today()

        # Create payment request
        payment_request = PaymentRequest.objects.create(
            organization=organization,
            requested_by=request.user,
            plan=plan,
            amount=plan.price,
            coupon=coupon,
            discount_amount=discount_amount,
            final_amount=final_amount,
            transaction_id=data.get('transaction_id', 'FREE-UPGRADE'),
            payment_date=payment_date,
            payment_method=data.get('payment_method', 'coupon'),
            payment_screenshot=data.get('payment_screenshot', ''),
            user_notes=data.get('user_notes', ''),
        )

        # Create notification for superadmin
        SuperAdminNotification.objects.create(
            notification_type='payment_received',
            title=f'New Payment Request from {organization.name}',
            message=f'{organization.name} has submitted a payment request for {plan.name} plan. Amount: ₹{data.get("final_amount")}. Transaction ID: {data.get("transaction_id")}',
            organization=organization,
            user=request.user,
            related_object_type='payment_request',
            related_object_id=str(payment_request.id),
            action_url='/superadmin/payment-requests'
        )

        return Response({
            'success': True,
            'message': 'Payment request submitted successfully. You will be notified once approved.',
            'request_id': str(payment_request.id),
        })
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_my_payment_requests(request):
    """
    Get payment requests for the current user's organization
    """
    from .models import PaymentRequest, OrganizationMembership

    # Get organization from membership
    membership = OrganizationMembership.objects.filter(
        user=request.user,
        is_active=True
    ).first()

    if not membership:
        return Response({'error': 'No organization found'}, status=status.HTTP_400_BAD_REQUEST)

    requests = PaymentRequest.objects.filter(
        organization=membership.organization
    ).select_related('plan', 'coupon', 'approved_by').order_by('-created_at')

    data = []
    for req in requests:
        data.append({
            'id': str(req.id),
            'plan_name': req.plan.name,
            'amount': str(req.amount),
            'discount_amount': str(req.discount_amount),
            'final_amount': str(req.final_amount),
            'coupon_code': req.coupon.code if req.coupon else None,
            'transaction_id': req.transaction_id,
            'payment_date': req.payment_date.isoformat(),
            'payment_method': req.payment_method,
            'status': req.status,
            'admin_notes': req.admin_notes,
            'rejection_reason': req.rejection_reason,
            'created_at': req.created_at.isoformat(),
            'processed_at': req.processed_at.isoformat() if req.processed_at else None,
        })

    return Response({'requests': data})


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def superadmin_payment_requests(request):
    """
    Get all payment requests (SuperAdmin only)
    """
    if not request.user.is_superuser:
        return Response({'error': 'SuperAdmin access required'}, status=status.HTTP_403_FORBIDDEN)

    from .models import PaymentRequest

    status_filter = request.GET.get('status', None)

    requests = PaymentRequest.objects.select_related(
        'organization', 'plan', 'coupon', 'requested_by', 'approved_by'
    ).order_by('-created_at')

    if status_filter:
        requests = requests.filter(status=status_filter)

    data = []
    for req in requests:
        data.append({
            'id': str(req.id),
            'organization_name': req.organization.name,
            'organization_id': str(req.organization.id),
            'requested_by': req.requested_by.email if req.requested_by else 'Unknown',
            'plan_name': req.plan.name,
            'plan_id': req.plan.id,
            'amount': str(req.amount),
            'discount_amount': str(req.discount_amount),
            'final_amount': str(req.final_amount),
            'coupon_code': req.coupon.code if req.coupon else None,
            'transaction_id': req.transaction_id,
            'payment_date': req.payment_date.isoformat(),
            'payment_method': req.payment_method,
            'payment_screenshot': req.payment_screenshot,
            'user_notes': req.user_notes,
            'status': req.status,
            'admin_notes': req.admin_notes,
            'rejection_reason': req.rejection_reason,
            'approved_by': req.approved_by.email if req.approved_by else None,
            'created_at': req.created_at.isoformat(),
            'processed_at': req.processed_at.isoformat() if req.processed_at else None,
        })

    # Get counts
    all_count = PaymentRequest.objects.count()
    pending_count = PaymentRequest.objects.filter(status='pending').count()
    approved_count = PaymentRequest.objects.filter(status='approved').count()
    rejected_count = PaymentRequest.objects.filter(status='rejected').count()

    return Response({
        'requests': data,
        'counts': {
            'all': all_count,
            'pending': pending_count,
            'approved': approved_count,
            'rejected': rejected_count,
        }
    })


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def superadmin_approve_payment_request(request, request_id):
    """
    Approve a payment request (SuperAdmin only)
    Creates/updates subscription for the organization
    """
    if not request.user.is_superuser:
        return Response({'error': 'SuperAdmin access required'}, status=status.HTTP_403_FORBIDDEN)

    from .models import PaymentRequest, Subscription, CouponUsage
    from datetime import date, timedelta
    from dateutil.relativedelta import relativedelta
    from django.utils import timezone

    try:
        payment_request = PaymentRequest.objects.select_related(
            'organization', 'plan', 'coupon'
        ).get(id=request_id)
    except PaymentRequest.DoesNotExist:
        return Response({'error': 'Payment request not found'}, status=status.HTTP_404_NOT_FOUND)

    if payment_request.status != 'pending':
        return Response({'error': 'This request has already been processed'}, status=status.HTTP_400_BAD_REQUEST)

    data = request.data
    admin_notes = data.get('admin_notes', '')

    try:
        organization = payment_request.organization
        plan = payment_request.plan

        # Calculate subscription dates
        today = date.today()

        # Calculate end date based on billing cycle
        if plan.billing_cycle == 'monthly':
            end_date = today + relativedelta(months=1)
        else:  # yearly
            end_date = today + relativedelta(years=1)

        # Add extended days if coupon provides
        extended_days = 0
        if payment_request.coupon and payment_request.coupon.discount_days:
            extended_days = payment_request.coupon.discount_days
            end_date = end_date + timedelta(days=extended_days)

        # Create or update subscription
        subscription, created = Subscription.objects.update_or_create(
            organization=organization,
            defaults={
                'plan': plan,
                'start_date': today,
                'end_date': end_date,
                'status': 'active',
                'auto_renew': False,
                'last_payment_date': payment_request.payment_date,
                'next_billing_date': end_date,
                'amount_paid': payment_request.final_amount,
                'coupon_applied': payment_request.coupon,
            }
        )

        # Record coupon usage if applied
        if payment_request.coupon:
            CouponUsage.objects.create(
                coupon=payment_request.coupon,
                organization=organization,
                user=payment_request.requested_by,
                subscription=subscription,
                discount_amount=payment_request.discount_amount,
                extended_days=extended_days,
            )
            # Increment coupon usage count
            payment_request.coupon.current_usage_count += 1
            payment_request.coupon.save()

        # Update organization plan
        organization.plan = plan.name.lower()
        organization.save()

        # Update payment request
        payment_request.status = 'approved'
        payment_request.approved_by = request.user
        payment_request.processed_at = timezone.now()
        payment_request.admin_notes = admin_notes
        payment_request.subscription = subscription
        payment_request.save()

        # Create notification for the tenant
        from .models import SuperAdminNotification
        SuperAdminNotification.objects.create(
            notification_type='payment_received',
            title='Subscription Activated!',
            message=f'Your payment for {plan.name} plan has been approved. Your subscription is now active until {end_date.strftime("%d %b %Y")}.',
            organization=organization,
            user=payment_request.requested_by,
        )

        return Response({
            'success': True,
            'message': f'Payment request approved. Subscription activated until {end_date.strftime("%d %b %Y")}.',
            'subscription_id': subscription.id,
            'end_date': end_date.isoformat(),
        })
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def superadmin_reject_payment_request(request, request_id):
    """
    Reject a payment request (SuperAdmin only)
    """
    if not request.user.is_superuser:
        return Response({'error': 'SuperAdmin access required'}, status=status.HTTP_403_FORBIDDEN)

    from .models import PaymentRequest, SuperAdminNotification
    from django.utils import timezone

    try:
        payment_request = PaymentRequest.objects.select_related(
            'organization', 'plan'
        ).get(id=request_id)
    except PaymentRequest.DoesNotExist:
        return Response({'error': 'Payment request not found'}, status=status.HTTP_404_NOT_FOUND)

    if payment_request.status != 'pending':
        return Response({'error': 'This request has already been processed'}, status=status.HTTP_400_BAD_REQUEST)

    data = request.data
    rejection_reason = data.get('rejection_reason', '')

    if not rejection_reason:
        return Response({'error': 'Rejection reason is required'}, status=status.HTTP_400_BAD_REQUEST)

    try:
        # Update payment request
        payment_request.status = 'rejected'
        payment_request.approved_by = request.user
        payment_request.processed_at = timezone.now()
        payment_request.rejection_reason = rejection_reason
        payment_request.admin_notes = data.get('admin_notes', '')
        payment_request.save()

        # Create notification for the tenant
        SuperAdminNotification.objects.create(
            notification_type='other',
            title='Payment Request Rejected',
            message=f'Your payment request for {payment_request.plan.name} plan has been rejected. Reason: {rejection_reason}',
            organization=payment_request.organization,
            user=payment_request.requested_by,
        )

        return Response({
            'success': True,
            'message': 'Payment request rejected.',
        })
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# =============================================================================
# REVIEW & TESTIMONIAL ENDPOINTS
# =============================================================================

@api_view(['GET'])
@permission_classes([AllowAny])
def get_public_reviews(request):
    """
    Get approved reviews for landing page (Public endpoint)
    """
    from .models import Review

    reviews = Review.objects.filter(
        status='approved'
    ).order_by('-is_featured', '-approved_at')[:10]  # Limit to 10 reviews

    data = []
    for review in reviews:
        data.append({
            'id': str(review.id),
            'rating': review.rating,
            'title': review.title,
            'content': review.content,
            'display_name': review.display_name,
            'designation': review.designation,
            'company_name': review.company_name,
            'profile_image': review.profile_image,
            'is_featured': review.is_featured,
        })

    return Response({'reviews': data})


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def check_review_eligibility(request):
    """
    Check if user can submit a review and if prompt should be shown.
    Eligible: Active subscription OR Trial period
    Prompt shown: First 3 logouts if no review submitted
    """
    from .models import Review, ReviewPromptDismissal, OrganizationMembership, Subscription

    # Get organization
    membership = OrganizationMembership.objects.filter(
        user=request.user,
        is_active=True
    ).first()

    if not membership:
        return Response({
            'eligible': False,
            'show_prompt': False,
            'reason': 'No organization found'
        })

    organization = membership.organization

    # Check subscription status (active OR trial allowed)
    try:
        subscription = Subscription.objects.get(organization=organization)
        is_eligible = subscription.status in ['active', 'trial', 'grace_period']
    except Subscription.DoesNotExist:
        is_eligible = False

    if not is_eligible:
        return Response({
            'eligible': False,
            'show_prompt': False,
            'reason': 'Active subscription required'
        })

    # Check if already has pending or approved review
    existing_review = Review.objects.filter(
        organization=organization,
        status__in=['pending', 'approved']
    ).first()

    has_submitted = existing_review is not None

    # Check dismissal count
    dismissal, _ = ReviewPromptDismissal.objects.get_or_create(user=request.user)
    show_prompt = dismissal.dismissal_count < 3 and not has_submitted

    return Response({
        'eligible': True,
        'has_submitted': has_submitted,
        'show_prompt': show_prompt,
        'dismissal_count': dismissal.dismissal_count,
    })


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def dismiss_review_prompt(request):
    """
    Increment dismissal count when user dismisses review prompt
    """
    from .models import ReviewPromptDismissal

    dismissal, _ = ReviewPromptDismissal.objects.get_or_create(user=request.user)
    dismissal.dismissal_count += 1
    dismissal.save()

    return Response({
        'success': True,
        'dismissal_count': dismissal.dismissal_count,
        'show_prompt': dismissal.dismissal_count < 3
    })


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def submit_review(request):
    """
    Submit a review (Tenant endpoint)
    """
    from .models import Review, OrganizationMembership, Subscription, SuperAdminNotification

    # Get organization
    membership = OrganizationMembership.objects.filter(
        user=request.user,
        is_active=True
    ).first()

    if not membership:
        return Response({'error': 'No organization found'}, status=status.HTTP_400_BAD_REQUEST)

    organization = membership.organization

    # Verify subscription status
    try:
        subscription = Subscription.objects.get(organization=organization)
        if subscription.status not in ['active', 'trial', 'grace_period']:
            return Response({'error': 'Active subscription required to submit review'}, status=status.HTTP_403_FORBIDDEN)
    except Subscription.DoesNotExist:
        return Response({'error': 'No subscription found'}, status=status.HTTP_403_FORBIDDEN)

    # Check if already has pending or approved review
    existing_review = Review.objects.filter(
        organization=organization,
        status__in=['pending', 'approved']
    ).first()

    if existing_review:
        return Response({
            'error': 'You already have a review submitted. Only one review per organization is allowed.'
        }, status=status.HTTP_400_BAD_REQUEST)

    data = request.data

    # Validate required fields
    required_fields = ['rating', 'title', 'content', 'display_name']
    for field in required_fields:
        if not data.get(field):
            return Response({'error': f'{field} is required'}, status=status.HTTP_400_BAD_REQUEST)

    # Validate rating
    rating = int(data.get('rating', 0))
    if rating < 1 or rating > 5:
        return Response({'error': 'Rating must be between 1 and 5'}, status=status.HTTP_400_BAD_REQUEST)

    try:
        review = Review.objects.create(
            organization=organization,
            submitted_by=request.user,
            rating=rating,
            title=data.get('title'),
            content=data.get('content'),
            display_name=data.get('display_name'),
            designation=data.get('designation', ''),
            company_name=data.get('company_name', ''),
            profile_image=data.get('profile_image', ''),
        )

        # Create notification for superadmin
        SuperAdminNotification.objects.create(
            notification_type='other',
            title=f'New Review from {organization.name}',
            message=f'{data.get("display_name")} submitted a {rating}-star review. Please review and approve.',
        )

        return Response({
            'success': True,
            'message': 'Thank you for your review! It will be visible on our website after approval.',
            'review_id': str(review.id),
        })
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def superadmin_reviews(request):
    """
    Get all reviews (SuperAdmin only)
    """
    if not request.user.is_superuser:
        return Response({'error': 'SuperAdmin access required'}, status=status.HTTP_403_FORBIDDEN)

    from .models import Review

    status_filter = request.GET.get('status', None)

    reviews = Review.objects.select_related(
        'organization', 'submitted_by', 'approved_by'
    ).order_by('-created_at')

    if status_filter:
        reviews = reviews.filter(status=status_filter)

    data = []
    for review in reviews:
        data.append({
            'id': str(review.id),
            'organization_name': review.organization.name,
            'submitted_by': review.submitted_by.email if review.submitted_by else 'Unknown',
            'rating': review.rating,
            'title': review.title,
            'content': review.content,
            'display_name': review.display_name,
            'designation': review.designation,
            'company_name': review.company_name,
            'profile_image': review.profile_image,
            'status': review.status,
            'is_featured': review.is_featured,
            'rejection_reason': review.rejection_reason,
            'approved_by': review.approved_by.email if review.approved_by else None,
            'approved_at': review.approved_at.isoformat() if review.approved_at else None,
            'created_at': review.created_at.isoformat(),
        })

    return Response({'reviews': data})


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def superadmin_approve_review(request, review_id):
    """
    Approve a review (SuperAdmin only)
    """
    if not request.user.is_superuser:
        return Response({'error': 'SuperAdmin access required'}, status=status.HTTP_403_FORBIDDEN)

    from .models import Review
    from django.utils import timezone

    try:
        review = Review.objects.get(id=review_id)
    except Review.DoesNotExist:
        return Response({'error': 'Review not found'}, status=status.HTTP_404_NOT_FOUND)

    if review.status != 'pending':
        return Response({'error': 'This review has already been processed'}, status=status.HTTP_400_BAD_REQUEST)

    try:
        review.status = 'approved'
        review.approved_by = request.user
        review.approved_at = timezone.now()
        review.save()

        return Response({
            'success': True,
            'message': 'Review approved and will now be visible on the landing page.',
        })
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def superadmin_reject_review(request, review_id):
    """
    Reject a review (SuperAdmin only)
    """
    if not request.user.is_superuser:
        return Response({'error': 'SuperAdmin access required'}, status=status.HTTP_403_FORBIDDEN)

    from .models import Review

    try:
        review = Review.objects.get(id=review_id)
    except Review.DoesNotExist:
        return Response({'error': 'Review not found'}, status=status.HTTP_404_NOT_FOUND)

    if review.status != 'pending':
        return Response({'error': 'This review has already been processed'}, status=status.HTTP_400_BAD_REQUEST)

    data = request.data
    rejection_reason = data.get('rejection_reason', '')

    if not rejection_reason:
        return Response({'error': 'Rejection reason is required'}, status=status.HTTP_400_BAD_REQUEST)

    try:
        review.status = 'rejected'
        review.rejection_reason = rejection_reason
        review.save()

        return Response({
            'success': True,
            'message': 'Review rejected.',
        })
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def superadmin_toggle_featured_review(request, review_id):
    """
    Toggle featured status of a review (SuperAdmin only)
    """
    if not request.user.is_superuser:
        return Response({'error': 'SuperAdmin access required'}, status=status.HTTP_403_FORBIDDEN)

    from .models import Review

    try:
        review = Review.objects.get(id=review_id)
    except Review.DoesNotExist:
        return Response({'error': 'Review not found'}, status=status.HTTP_404_NOT_FOUND)

    if review.status != 'approved':
        return Response({'error': 'Only approved reviews can be featured'}, status=status.HTTP_400_BAD_REQUEST)

    try:
        review.is_featured = not review.is_featured
        review.save()

        return Response({
            'success': True,
            'is_featured': review.is_featured,
            'message': 'Review featured successfully.' if review.is_featured else 'Review unfeatured.',
        })
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
