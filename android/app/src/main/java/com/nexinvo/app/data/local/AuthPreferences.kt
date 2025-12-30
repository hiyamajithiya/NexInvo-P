package com.nexinvo.app.data.local

import android.content.Context
import androidx.datastore.core.DataStore
import androidx.datastore.preferences.core.Preferences
import androidx.datastore.preferences.core.booleanPreferencesKey
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map
import javax.inject.Inject
import javax.inject.Singleton

private val Context.dataStore: DataStore<Preferences> by preferencesDataStore(name = "auth_prefs")

@Singleton
class AuthPreferences @Inject constructor(
    @ApplicationContext private val context: Context
) {
    private val dataStore = context.dataStore

    companion object {
        private val ACCESS_TOKEN = stringPreferencesKey("access_token")
        private val REFRESH_TOKEN = stringPreferencesKey("refresh_token")
        private val SESSION_TOKEN = stringPreferencesKey("session_token")
        private val USER_ID = stringPreferencesKey("user_id")
        private val USER_EMAIL = stringPreferencesKey("user_email")
        private val USER_NAME = stringPreferencesKey("user_name")
        private val IS_SUPERUSER = booleanPreferencesKey("is_superuser")
        private val ORGANIZATION_ID = stringPreferencesKey("organization_id")
        private val ORGANIZATION_NAME = stringPreferencesKey("organization_name")
        private val USER_ROLE = stringPreferencesKey("user_role")
        private val IS_LOGGED_IN = booleanPreferencesKey("is_logged_in")
    }

    val isLoggedIn: Flow<Boolean> = dataStore.data.map { prefs ->
        prefs[IS_LOGGED_IN] ?: false
    }

    val accessToken: Flow<String?> = dataStore.data.map { prefs ->
        prefs[ACCESS_TOKEN]
    }

    val refreshToken: Flow<String?> = dataStore.data.map { prefs ->
        prefs[REFRESH_TOKEN]
    }

    val sessionToken: Flow<String?> = dataStore.data.map { prefs ->
        prefs[SESSION_TOKEN]
    }

    val organizationId: Flow<String?> = dataStore.data.map { prefs ->
        prefs[ORGANIZATION_ID]
    }

    val userInfo: Flow<UserInfo> = dataStore.data.map { prefs ->
        UserInfo(
            userId = prefs[USER_ID],
            email = prefs[USER_EMAIL],
            name = prefs[USER_NAME],
            isSuperuser = prefs[IS_SUPERUSER] ?: false,
            organizationId = prefs[ORGANIZATION_ID],
            organizationName = prefs[ORGANIZATION_NAME],
            role = prefs[USER_ROLE]
        )
    }

    suspend fun saveTokens(
        accessToken: String,
        refreshToken: String,
        sessionToken: String?
    ) {
        dataStore.edit { prefs ->
            prefs[ACCESS_TOKEN] = accessToken
            prefs[REFRESH_TOKEN] = refreshToken
            sessionToken?.let { prefs[SESSION_TOKEN] = it }
            prefs[IS_LOGGED_IN] = true
        }
    }

    suspend fun updateAccessToken(accessToken: String) {
        dataStore.edit { prefs ->
            prefs[ACCESS_TOKEN] = accessToken
        }
    }

    suspend fun saveUserInfo(
        userId: Int?,
        email: String?,
        name: String?,
        isSuperuser: Boolean?,
        organizationId: String?,
        organizationName: String?,
        role: String?
    ) {
        dataStore.edit { prefs ->
            userId?.let { prefs[USER_ID] = it.toString() }
            email?.let { prefs[USER_EMAIL] = it }
            name?.let { prefs[USER_NAME] = it }
            isSuperuser?.let { prefs[IS_SUPERUSER] = it }
            organizationId?.let { prefs[ORGANIZATION_ID] = it }
            organizationName?.let { prefs[ORGANIZATION_NAME] = it }
            role?.let { prefs[USER_ROLE] = it }
        }
    }

    suspend fun setOrganization(organizationId: String, organizationName: String) {
        dataStore.edit { prefs ->
            prefs[ORGANIZATION_ID] = organizationId
            prefs[ORGANIZATION_NAME] = organizationName
        }
    }

    suspend fun clearAll() {
        dataStore.edit { prefs ->
            prefs.clear()
        }
    }

    suspend fun getAccessTokenSync(): String? {
        var token: String? = null
        dataStore.data.collect { prefs ->
            token = prefs[ACCESS_TOKEN]
        }
        return token
    }
}

data class UserInfo(
    val userId: String?,
    val email: String?,
    val name: String?,
    val isSuperuser: Boolean,
    val organizationId: String?,
    val organizationName: String?,
    val role: String?
)
