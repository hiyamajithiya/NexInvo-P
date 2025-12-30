package com.nexinvo.app.di

import com.nexinvo.app.BuildConfig
import com.nexinvo.app.data.api.ApiService
import com.nexinvo.app.data.local.AuthPreferences
import dagger.Module
import dagger.Provides
import dagger.hilt.InstallIn
import dagger.hilt.components.SingletonComponent
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.runBlocking
import okhttp3.Interceptor
import okhttp3.OkHttpClient
import okhttp3.logging.HttpLoggingInterceptor
import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory
import java.util.concurrent.TimeUnit
import javax.inject.Singleton

@Module
@InstallIn(SingletonComponent::class)
object NetworkModule {

    @Provides
    @Singleton
    fun provideAuthInterceptor(authPreferences: AuthPreferences): Interceptor {
        return Interceptor { chain ->
            val originalRequest = chain.request()

            // Get tokens synchronously
            val accessToken = runBlocking { authPreferences.accessToken.first() }
            val sessionToken = runBlocking { authPreferences.sessionToken.first() }
            val organizationId = runBlocking { authPreferences.organizationId.first() }

            val newRequest = originalRequest.newBuilder().apply {
                // Add Authorization header if we have a token
                accessToken?.let {
                    addHeader("Authorization", "Bearer $it")
                }

                // Add session token header
                sessionToken?.let {
                    addHeader("X-Session-Token", it)
                }

                // Add organization header
                organizationId?.let {
                    addHeader("X-Organization-ID", it)
                }

                // Add content type
                addHeader("Content-Type", "application/json")
                addHeader("Accept", "application/json")
            }.build()

            chain.proceed(newRequest)
        }
    }

    @Provides
    @Singleton
    fun provideLoggingInterceptor(): HttpLoggingInterceptor {
        return HttpLoggingInterceptor().apply {
            level = if (BuildConfig.DEBUG) {
                HttpLoggingInterceptor.Level.BODY
            } else {
                HttpLoggingInterceptor.Level.NONE
            }
        }
    }

    @Provides
    @Singleton
    fun provideOkHttpClient(
        authInterceptor: Interceptor,
        loggingInterceptor: HttpLoggingInterceptor
    ): OkHttpClient {
        return OkHttpClient.Builder()
            .addInterceptor(authInterceptor)
            .addInterceptor(loggingInterceptor)
            .connectTimeout(30, TimeUnit.SECONDS)
            .readTimeout(30, TimeUnit.SECONDS)
            .writeTimeout(30, TimeUnit.SECONDS)
            .build()
    }

    @Provides
    @Singleton
    fun provideRetrofit(okHttpClient: OkHttpClient): Retrofit {
        return Retrofit.Builder()
            .baseUrl(BuildConfig.API_BASE_URL)
            .client(okHttpClient)
            .addConverterFactory(GsonConverterFactory.create())
            .build()
    }

    @Provides
    @Singleton
    fun provideApiService(retrofit: Retrofit): ApiService {
        return retrofit.create(ApiService::class.java)
    }
}
