"""
Tally Sync Module
Handles communication with Tally Prime/ERP 9 via ODBC protocol.
"""
import requests
import xml.etree.ElementTree as ET
from datetime import datetime
from decimal import Decimal
from django.utils import timezone
from django.db.models import Sum


class TallyConnector:
    """
    Handles connection and communication with Tally via HTTP/XML.
    Tally uses HTTP POST with XML payload on port 9000 by default.
    """

    def __init__(self, host='localhost', port=9000):
        self.host = host
        self.port = port
        self.base_url = f"http://{host}:{port}"

    def _send_request(self, xml_data):
        """Send XML request to Tally and return response"""
        try:
            headers = {'Content-Type': 'application/xml'}
            response = requests.post(
                self.base_url,
                data=xml_data.encode('utf-8'),
                headers=headers,
                timeout=30
            )
            return response.text
        except requests.exceptions.ConnectionError:
            raise ConnectionError("Cannot connect to Tally. Ensure Tally is running with ODBC enabled.")
        except requests.exceptions.Timeout:
            raise TimeoutError("Tally request timed out. Please try again.")

    def check_connection(self):
        """
        Check if Tally is running and accessible.
        Returns company info if connected.
        """
        # XML request to get Tally info
        xml_request = """
        <ENVELOPE>
            <HEADER>
                <VERSION>1</VERSION>
                <TALLYREQUEST>Export</TALLYREQUEST>
                <TYPE>Data</TYPE>
                <ID>MyTallyInfo</ID>
            </HEADER>
            <BODY>
                <DESC>
                    <STATICVARIABLES>
                        <SVEXPORTFORMAT>$$SysName:XML</SVEXPORTFORMAT>
                    </STATICVARIABLES>
                    <TDL>
                        <TDLMESSAGE>
                            <REPORT NAME="MyTallyInfo">
                                <FORMS>MyTallyInfoForm</FORMS>
                            </REPORT>
                            <FORM NAME="MyTallyInfoForm">
                                <PARTS>MyTallyInfoPart</PARTS>
                            </FORM>
                            <PART NAME="MyTallyInfoPart">
                                <LINES>MyTallyInfoLine</LINES>
                                <REPEAT>MyTallyInfoLine : MyTallyInfoColl</REPEAT>
                                <SCROLLED>Vertical</SCROLLED>
                            </PART>
                            <LINE NAME="MyTallyInfoLine">
                                <FIELDS>FldCompName, FldTallyVer</FIELDS>
                            </LINE>
                            <FIELD NAME="FldCompName">
                                <SET>$$Name</SET>
                            </FIELD>
                            <FIELD NAME="FldTallyVer">
                                <SET>$$LicenseInfo:TallyVersion</SET>
                            </FIELD>
                            <COLLECTION NAME="MyTallyInfoColl">
                                <TYPE>Company</TYPE>
                            </COLLECTION>
                        </TDLMESSAGE>
                    </TDL>
                </DESC>
            </BODY>
        </ENVELOPE>
        """.strip()

        try:
            response = self._send_request(xml_request)

            # Parse response to get company name and version
            if '<COMPANYNAME>' in response or '<FLDCOMPNAME>' in response:
                # Try to extract company name
                company_name = ''
                tally_version = ''

                try:
                    root = ET.fromstring(response)
                    # Look for company name
                    for elem in root.iter():
                        if elem.tag.upper() in ['COMPANYNAME', 'FLDCOMPNAME', 'NAME']:
                            if elem.text:
                                company_name = elem.text
                                break
                        if elem.tag.upper() in ['TALLYVERSION', 'FLDTALLYVER']:
                            if elem.text:
                                tally_version = elem.text
                except ET.ParseError:
                    pass

                return {
                    'connected': True,
                    'message': 'Connected to Tally successfully',
                    'company_name': company_name or 'Unknown',
                    'tally_version': tally_version or 'Tally Prime/ERP'
                }

            # Simple connection test if detailed info not available
            return {
                'connected': True,
                'message': 'Connected to Tally',
                'company_name': 'Connected',
                'tally_version': 'Tally'
            }

        except (ConnectionError, TimeoutError) as e:
            return {
                'connected': False,
                'message': str(e),
                'company_name': '',
                'tally_version': ''
            }

    def get_ledgers(self, group=None):
        """
        Fetch list of ledgers from Tally.
        Optionally filter by group (e.g., 'Sales Accounts', 'Duties & Taxes')
        Uses simple XML export compatible with Tally Prime and ERP 9.
        """
        import re

        # Simple request to export all ledgers - works with both Tally Prime and ERP 9
        xml_request = """<ENVELOPE>
<HEADER>
<TALLYREQUEST>Export Data</TALLYREQUEST>
</HEADER>
<BODY>
<EXPORTDATA>
<REQUESTDESC>
<REPORTNAME>List of Accounts</REPORTNAME>
<STATICVARIABLES>
<ACCOUNTTYPE>Ledgers</ACCOUNTTYPE>
</STATICVARIABLES>
</REQUESTDESC>
</EXPORTDATA>
</BODY>
</ENVELOPE>"""

        try:
            response = self._send_request(xml_request)
            ledgers = []

            # Debug: Print first 1000 chars of response
            print(f"Tally Response (first 1000 chars): {response[:1000]}")

            # First try regex-based parsing (more robust for Tally's sometimes malformed XML)
            ledgers = self._parse_ledgers_with_regex(response, group)

            if ledgers:
                print(f"Parsed {len(ledgers)} ledgers using regex")
                return ledgers

            # Fallback to XML parsing
            try:
                # Clean the XML response of invalid characters
                cleaned_response = self._clean_xml_response(response)
                root = ET.fromstring(cleaned_response)

                # Method 1: Look for LEDGER elements with NAME attribute
                for ledger in root.iter('LEDGER'):
                    name = ledger.get('NAME', '')
                    parent_group = ''

                    # Try to find parent from PARENT element
                    parent_elem = ledger.find('PARENT')
                    if parent_elem is not None and parent_elem.text:
                        parent_group = parent_elem.text

                    if name and name not in [l['name'] for l in ledgers]:
                        ledger_info = {'name': name, 'group': parent_group}
                        if group is None or parent_group.lower() == group.lower():
                            ledgers.append(ledger_info)

                print(f"Parsed {len(ledgers)} ledgers from Tally using XML")

            except ET.ParseError as e:
                print(f"XML Parse Error: {e}")
                # Regex parsing already tried above

            return ledgers

        except Exception as e:
            print(f"Error fetching ledgers: {e}")
            return []

    def _clean_xml_response(self, response):
        """Clean invalid characters from XML response."""
        import re
        # Remove invalid XML characters (control characters except tab, newline, carriage return)
        cleaned = re.sub(r'[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]', '', response)
        # Also handle invalid character references
        cleaned = re.sub(r'&#x[0-9A-Fa-f]+;', '', cleaned)
        cleaned = re.sub(r'&#[0-9]+;', lambda m: '' if int(m.group()[2:-1]) < 32 else m.group(), cleaned)
        return cleaned

    def _parse_ledgers_with_regex(self, response, group=None):
        """
        Parse ledgers using regex - more robust for Tally's XML format.
        Tally often returns FLDLEDGERNAME and FLDPARENTGROUP pairs.
        """
        import re
        ledgers = []

        # Pattern to match FLDLEDGERNAME followed by FLDPARENTGROUP
        # Handle both with and without XML entities
        pattern = r'<FLDLEDGERNAME>(.*?)</FLDLEDGERNAME>\s*<FLDPARENTGROUP>(.*?)</FLDPARENTGROUP>'
        matches = re.findall(pattern, response, re.DOTALL | re.IGNORECASE)

        for name, parent_group in matches:
            # Decode HTML entities
            name = name.strip()
            parent_group = parent_group.strip()

            # Handle &amp; -> &
            name = name.replace('&amp;', '&').replace('&lt;', '<').replace('&gt;', '>')
            parent_group = parent_group.replace('&amp;', '&').replace('&lt;', '<').replace('&gt;', '>')

            if name and name not in [l['name'] for l in ledgers]:
                ledger_info = {'name': name, 'group': parent_group}
                if group is None or parent_group.lower() == group.lower():
                    ledgers.append(ledger_info)

        # If no FLDLEDGERNAME found, try standard LEDGER elements
        if not ledgers:
            # Pattern for LEDGER NAME="..." with PARENT element
            ledger_pattern = r'<LEDGER\s+NAME="([^"]+)"[^>]*>.*?(?:<PARENT>([^<]*)</PARENT>)?'
            matches = re.findall(ledger_pattern, response, re.DOTALL | re.IGNORECASE)

            for name, parent_group in matches:
                name = name.strip()
                parent_group = (parent_group or '').strip()

                if name and name not in [l['name'] for l in ledgers]:
                    ledger_info = {'name': name, 'group': parent_group}
                    if group is None or (not parent_group) or parent_group.lower() == group.lower():
                        ledgers.append(ledger_info)

        return ledgers

    def _get_ledgers_simple(self):
        """
        Fallback method using simpler XML request for Tally Prime.
        """
        xml_request = """<ENVELOPE>
<HEADER>
<VERSION>1</VERSION>
<TALLYREQUEST>Export</TALLYREQUEST>
<TYPE>Collection</TYPE>
<ID>List of Ledgers</ID>
</HEADER>
<BODY>
<DESC>
<STATICVARIABLES>
<SVEXPORTFORMAT>$$SysName:XML</SVEXPORTFORMAT>
</STATICVARIABLES>
<FETCH>NAME, PARENT</FETCH>
</DESC>
</BODY>
</ENVELOPE>"""

        try:
            response = self._send_request(xml_request)
            ledgers = []

            print(f"Simple Request Response (first 1000 chars): {response[:1000]}")

            try:
                root = ET.fromstring(response)

                # Look for LEDGER or COLLECTION elements
                for ledger in root.iter():
                    if ledger.tag.upper() == 'LEDGER':
                        name = ledger.get('NAME', '')
                        if not name:
                            name_elem = ledger.find('NAME')
                            if name_elem is not None:
                                name = name_elem.text or ''

                        parent = ''
                        parent_elem = ledger.find('PARENT')
                        if parent_elem is not None:
                            parent = parent_elem.text or ''

                        if name and name not in [l['name'] for l in ledgers]:
                            ledgers.append({'name': name, 'group': parent})

                print(f"Simple request parsed {len(ledgers)} ledgers")

            except ET.ParseError:
                pass

            return ledgers

        except Exception as e:
            print(f"Simple request error: {e}")
            return []

    def create_sales_voucher(self, invoice, mapping):
        """
        Create a Sales Voucher XML for posting to Tally.
        Uses Tally Prime compatible XML format.
        """
        # Format date as Tally expects (YYYYMMDD)
        invoice_date = invoice.invoice_date.strftime('%Y%m%d')

        # Determine if inter-state or intra-state
        # Determine if interstate (IGST) or local (CGST/SGST)
        # Priority: stateCode > state field
        company_state_code = ''
        client_state_code = ''
        
        if hasattr(invoice.organization, 'company_settings'):
            cs = invoice.organization.company_settings
            company_state_code = str(cs.stateCode).strip() if cs.stateCode else ''
            if not company_state_code:
                company_state_code = str(cs.state).strip().lower() if cs.state else ''
        
        if invoice.client:
            client_state_code = str(invoice.client.stateCode).strip() if invoice.client.stateCode else ''
            if not client_state_code and invoice.client.gstin and len(invoice.client.gstin) >= 2:
                client_state_code = str(invoice.client.gstin[:2]).strip()
            if not client_state_code:
                client_state_code = str(invoice.client.state).strip().lower() if invoice.client.state else ''
        
        # Default to IGST if unable to determine states
        is_interstate = True
        if company_state_code and client_state_code:
            is_interstate = company_state_code.lower() != client_state_code.lower()

        # Calculate amounts from Invoice model
        subtotal = invoice.subtotal or Decimal('0')
        tax_amount = invoice.tax_amount or Decimal('0')
        round_off = invoice.round_off or Decimal('0')
        total = invoice.total_amount or Decimal('0')

        # Split tax into CGST/SGST or IGST based on interstate status
        if is_interstate:
            igst = tax_amount
            cgst = Decimal('0')
            sgst = Decimal('0')
        else:
            igst = Decimal('0')
            cgst = tax_amount / 2
            sgst = tax_amount / 2

        # Party name (client) - escape special XML characters
        party_name = invoice.client.name if invoice.client else 'Cash'
        party_name = party_name.replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;')

        # Build ledger entries XML
        ledger_entries = []

        # Debit: Party (Customer) - total amount (negative = debit in Tally)
        ledger_entries.append(f'''<ALLLEDGERENTRIES.LIST>
<LEDGERNAME>{party_name}</LEDGERNAME>
<ISDEEMEDPOSITIVE>Yes</ISDEEMEDPOSITIVE>
<AMOUNT>-{total:.2f}</AMOUNT>
</ALLLEDGERENTRIES.LIST>''')

        # Credit: Sales - subtotal (positive = credit in Tally)
        sales_ledger = mapping.sales_ledger.replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;')
        ledger_entries.append(f'''<ALLLEDGERENTRIES.LIST>
<LEDGERNAME>{sales_ledger}</LEDGERNAME>
<ISDEEMEDPOSITIVE>No</ISDEEMEDPOSITIVE>
<AMOUNT>{subtotal:.2f}</AMOUNT>
</ALLLEDGERENTRIES.LIST>''')

        # GST Entries
        if is_interstate and igst > 0:
            igst_ledger = mapping.igst_ledger.replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;')
            ledger_entries.append(f'''<ALLLEDGERENTRIES.LIST>
<LEDGERNAME>{igst_ledger}</LEDGERNAME>
<ISDEEMEDPOSITIVE>No</ISDEEMEDPOSITIVE>
<AMOUNT>{igst:.2f}</AMOUNT>
</ALLLEDGERENTRIES.LIST>''')
        else:
            if cgst > 0 and mapping.cgst_ledger:
                cgst_ledger = mapping.cgst_ledger.replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;')
                ledger_entries.append(f'''<ALLLEDGERENTRIES.LIST>
<LEDGERNAME>{cgst_ledger}</LEDGERNAME>
<ISDEEMEDPOSITIVE>No</ISDEEMEDPOSITIVE>
<AMOUNT>{cgst:.2f}</AMOUNT>
</ALLLEDGERENTRIES.LIST>''')
            if sgst > 0 and mapping.sgst_ledger:
                sgst_ledger = mapping.sgst_ledger.replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;')
                ledger_entries.append(f'''<ALLLEDGERENTRIES.LIST>
<LEDGERNAME>{sgst_ledger}</LEDGERNAME>
<ISDEEMEDPOSITIVE>No</ISDEEMEDPOSITIVE>
<AMOUNT>{sgst:.2f}</AMOUNT>
</ALLLEDGERENTRIES.LIST>''')

        # Round Off (if any)
        if round_off != 0 and mapping.round_off_ledger:
            round_off_ledger = mapping.round_off_ledger.replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;')
            # Positive round_off = we added to total (credit to round off ledger)
            # Negative round_off = we subtracted from total (debit to round off ledger)
            is_positive = round_off > 0
            ledger_entries.append(f'''<ALLLEDGERENTRIES.LIST>
<LEDGERNAME>{round_off_ledger}</LEDGERNAME>
<ISDEEMEDPOSITIVE>{'No' if is_positive else 'Yes'}</ISDEEMEDPOSITIVE>
<AMOUNT>{round_off:.2f}</AMOUNT>
</ALLLEDGERENTRIES.LIST>''')

        ledger_entries_xml = '\n'.join(ledger_entries)

        # Build complete voucher XML using minimal Tally format
        # Tally is very specific about the XML structure - use minimal required fields
        voucher_xml = f'''<ENVELOPE>
<HEADER>
<TALLYREQUEST>Import Data</TALLYREQUEST>
</HEADER>
<BODY>
<IMPORTDATA>
<REQUESTDESC>
<REPORTNAME>Vouchers</REPORTNAME>
</REQUESTDESC>
<REQUESTDATA>
<TALLYMESSAGE xmlns:UDF="TallyUDF">
<VOUCHER VCHTYPE="Sales" ACTION="Create">
<DATE>{invoice_date}</DATE>
<VOUCHERTYPENAME>Sales</VOUCHERTYPENAME>
<VOUCHERNUMBER>{invoice.invoice_number}</VOUCHERNUMBER>
<REFERENCE>{invoice.invoice_number}</REFERENCE>
<PARTYLEDGERNAME>{party_name}</PARTYLEDGERNAME>
<NARRATION>{self._build_narration(invoice)}</NARRATION>
<ISINVOICE>Yes</ISINVOICE>
<EFFECTIVEDATE>{invoice_date}</EFFECTIVEDATE>
{ledger_entries_xml}
</VOUCHER>
</TALLYMESSAGE>
</REQUESTDATA>
</IMPORTDATA>
</BODY>
</ENVELOPE>'''

        print(f"Generated Voucher XML for {invoice.invoice_number}:")
        print(voucher_xml)
        return voucher_xml

    def _build_narration(self, invoice):
        """
        Build narration text for Tally voucher.
        Includes invoice notes if available.
        """
        narration_parts = []

        # Add invoice notes if available
        if invoice.notes and invoice.notes.strip():
            # Escape XML special characters in notes
            notes = invoice.notes.strip()
            notes = notes.replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;')
            notes = notes.replace('\n', ' ').replace('\r', '')  # Remove newlines
            narration_parts.append(notes)

        # Add NexInvo reference at the end
        narration_parts.append(f"[Invoice {invoice.invoice_number} - Imported from NexInvo]")

        return ' | '.join(narration_parts) if len(narration_parts) > 1 else narration_parts[0]

    def check_voucher_exists(self, voucher_number, voucher_date):
        """
        Check if a voucher with the given number already exists in Tally.
        Returns True if exists, False otherwise.
        """
        date_str = voucher_date.strftime('%Y%m%d')

        xml_request = f"""<ENVELOPE>
<HEADER>
<TALLYREQUEST>Export Data</TALLYREQUEST>
</HEADER>
<BODY>
<EXPORTDATA>
<REQUESTDESC>
<REPORTNAME>Voucher Register</REPORTNAME>
<STATICVARIABLES>
<SVFROMDATE>{date_str}</SVFROMDATE>
<SVTODATE>{date_str}</SVTODATE>
<SVCURRENTCOMPANY>##SVCurrentCompany</SVCURRENTCOMPANY>
</STATICVARIABLES>
</REQUESTDESC>
</EXPORTDATA>
</BODY>
</ENVELOPE>"""

        try:
            response = self._send_request(xml_request)
            # Check if the voucher number appears in the response
            return voucher_number in response
        except Exception as e:
            print(f"Error checking voucher existence: {e}")
            return False  # Assume doesn't exist if we can't check

    def create_party_ledger(self, client, mapping):
        """
        Create a Party Ledger (Customer) in Tally if it doesn't exist.
        """
        party_name = client.name
        gstin = client.gstin or ''
        state = client.state or ''
        address = f"{client.address or ''}, {client.city or ''}, {state} {client.pinCode or ''}".strip(', ')

        xml_request = f"""
        <ENVELOPE>
            <HEADER>
                <TALLYREQUEST>Import Data</TALLYREQUEST>
            </HEADER>
            <BODY>
                <IMPORTDATA>
                    <REQUESTDESC>
                        <REPORTNAME>All Masters</REPORTNAME>
                    </REQUESTDESC>
                    <REQUESTDATA>
                        <TALLYMESSAGE xmlns:UDF="TallyUDF">
                            <LEDGER NAME="{party_name}" ACTION="Create">
                                <NAME>{party_name}</NAME>
                                <PARENT>{mapping.default_party_group}</PARENT>
                                <ISBILLWISEON>Yes</ISBILLWISEON>
                                <AFFECTSSTOCK>No</AFFECTSSTOCK>
                                <ADDRESS.LIST>
                                    <ADDRESS>{address}</ADDRESS>
                                </ADDRESS.LIST>
                                <LEDGERGSTIN>{gstin}</LEDGERGSTIN>
                                <LEDGERSTATENAME>{state}</LEDGERSTATENAME>
                            </LEDGER>
                        </TALLYMESSAGE>
                    </REQUESTDATA>
                </IMPORTDATA>
            </BODY>
        </ENVELOPE>
        """.strip()

        try:
            response = self._send_request(xml_request)
            # Check for success in response
            return 'Created' in response or 'CREATED' in response or 'success' in response.lower()
        except Exception as e:
            print(f"Error creating party ledger: {e}")
            return False

    def post_voucher(self, xml_data):
        """
        Post a voucher XML to Tally and return the result.
        """
        import re
        try:
            response = self._send_request(xml_data)
            print(f"Tally Voucher Response: {response}")

            # Parse the response to check CREATED count
            created_match = re.search(r'<CREATED>(\d+)</CREATED>', response, re.IGNORECASE)
            created_count = int(created_match.group(1)) if created_match else 0

            altered_match = re.search(r'<ALTERED>(\d+)</ALTERED>', response, re.IGNORECASE)
            altered_count = int(altered_match.group(1)) if altered_match else 0

            errors_match = re.search(r'<ERRORS>(\d+)</ERRORS>', response, re.IGNORECASE)
            errors_count = int(errors_match.group(1)) if errors_match else 0

            exceptions_match = re.search(r'<EXCEPTIONS>(\d+)</EXCEPTIONS>', response, re.IGNORECASE)
            exceptions_count = int(exceptions_match.group(1)) if exceptions_match else 0

            # Check for error messages in response
            lineerror_match = re.search(r'<LINEERROR>(.*?)</LINEERROR>', response, re.IGNORECASE | re.DOTALL)
            error_message = lineerror_match.group(1) if lineerror_match else ''

            print(f"Tally Response - Created: {created_count}, Altered: {altered_count}, Errors: {errors_count}, Exceptions: {exceptions_count}")

            # Success only if at least one voucher was created or altered
            success = (created_count > 0 or altered_count > 0) and errors_count == 0

            if success:
                return {
                    'success': True,
                    'response': response,
                    'message': f'Voucher posted successfully (Created: {created_count}, Altered: {altered_count})'
                }
            else:
                error_msg = error_message or f'Tally rejected voucher (Created: {created_count}, Errors: {errors_count}, Exceptions: {exceptions_count})'
                return {
                    'success': False,
                    'response': response,
                    'message': error_msg
                }

        except Exception as e:
            print(f"Error posting voucher: {e}")
            return {
                'success': False,
                'response': str(e),
                'message': f'Error posting voucher: {str(e)}'
            }


def sync_invoices_to_tally(organization, user, start_date, end_date, mapping, force_resync=False):
    """
    Main function to sync invoices to Tally.

    Args:
        organization: Organization to sync
        user: User performing the sync
        start_date: Start date for invoice filter
        end_date: End date for invoice filter
        mapping: TallyMapping configuration
        force_resync: If True, re-sync invoices even if already synced (for when deleted from Tally)
    """
    from .models import Invoice, TallySyncHistory, InvoiceTallySync

    print(f"Starting Tally sync for org {organization.id} from {start_date} to {end_date} (force_resync={force_resync})")

    # Create sync history record
    sync_history = TallySyncHistory.objects.create(
        organization=organization,
        user=user,
        start_date=start_date,
        end_date=end_date,
        status='success'
    )

    # Initialize Tally connector
    connector = TallyConnector(host=mapping.tally_host, port=mapping.tally_port)

    # Get invoices to sync - include all tax invoices with statuses that make sense
    # (draft, sent, paid, overdue, partially_paid)
    invoices_query = Invoice.objects.filter(
        organization=organization,
        invoice_date__gte=start_date,
        invoice_date__lte=end_date,
        invoice_type='tax'
    )

    if force_resync:
        # Include all invoices, even already synced ones
        invoices = invoices_query
        print("Force resync enabled - including previously synced invoices")
    else:
        # Exclude already synced invoices
        invoices = invoices_query.exclude(tally_sync__synced=True)

    total_count = invoices.count()
    print(f"Found {total_count} tax invoices to sync")

    # Also log if there are proforma invoices in the date range
    proforma_count = Invoice.objects.filter(
        organization=organization,
        invoice_date__gte=start_date,
        invoice_date__lte=end_date,
        invoice_type='proforma'
    ).count()
    if proforma_count > 0:
        print(f"Note: {proforma_count} proforma invoices found but not synced (only tax invoices are synced)")

    synced_count = 0
    failed_count = 0
    failed_ids = []
    total_amount = Decimal('0')
    skipped_existing = 0  # Invoices that still exist in Tally (for force_resync)

    for invoice in invoices:
        try:
            print(f"Syncing invoice {invoice.invoice_number} (status: {invoice.status})")

            # Check if invoice was previously synced
            existing_sync = InvoiceTallySync.objects.filter(invoice=invoice).first()

            # If force_resync and previously synced, check if still exists in Tally
            if force_resync and existing_sync:
                voucher_exists = connector.check_voucher_exists(
                    invoice.invoice_number,
                    invoice.invoice_date
                )
                if voucher_exists:
                    print(f"Invoice {invoice.invoice_number} already exists in Tally - skipping")
                    skipped_existing += 1
                    continue
                else:
                    print(f"Invoice {invoice.invoice_number} not found in Tally - will re-sync")
                    # Delete old sync record to allow re-creation
                    existing_sync.delete()

            # Create party ledger first (if needed)
            if invoice.client:
                connector.create_party_ledger(invoice.client, mapping)

            # Generate and post voucher
            voucher_xml = connector.create_sales_voucher(invoice, mapping)
            result = connector.post_voucher(voucher_xml)

            if result['success']:
                # Mark invoice as synced
                InvoiceTallySync.objects.create(
                    invoice=invoice,
                    sync_history=sync_history,
                    synced=True,
                    tally_voucher_number=invoice.invoice_number,
                    tally_voucher_date=invoice.invoice_date
                )
                synced_count += 1
                total_amount += invoice.total_amount or Decimal('0')
                print(f"Successfully synced invoice {invoice.invoice_number}")
            else:
                failed_count += 1
                failed_ids.append(invoice.id)
                print(f"Failed to sync invoice {invoice.invoice_number}: {result.get('message', 'Unknown error')}")

        except Exception as e:
            print(f"Error syncing invoice {invoice.invoice_number}: {e}")
            import traceback
            traceback.print_exc()
            failed_count += 1
            failed_ids.append(invoice.id)

    # Update sync history
    sync_history.invoices_synced = synced_count
    sync_history.invoices_failed = failed_count
    sync_history.total_amount = total_amount
    sync_history.failed_invoice_ids = failed_ids
    sync_history.sync_completed_at = timezone.now()

    if failed_count > 0 and synced_count > 0:
        sync_history.status = 'partial'
    elif failed_count > 0 and synced_count == 0:
        sync_history.status = 'failed'

    sync_history.save()

    message = f'Synced {synced_count} of {total_count} invoices'
    if skipped_existing > 0:
        message += f' ({skipped_existing} already exist in Tally)'

    return {
        'success': synced_count > 0 or (force_resync and skipped_existing > 0),
        'total_count': total_count,
        'synced_count': synced_count,
        'failed_count': failed_count,
        'skipped_existing': skipped_existing,
        'total_amount': str(total_amount),
        'message': message
    }
