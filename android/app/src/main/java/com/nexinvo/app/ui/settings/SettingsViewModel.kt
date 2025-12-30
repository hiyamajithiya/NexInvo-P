package com.nexinvo.app.ui.settings

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.nexinvo.app.data.local.AuthPreferences
import com.nexinvo.app.data.local.UserInfo
import com.nexinvo.app.data.repository.AuthRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.launch
import javax.inject.Inject

@HiltViewModel
class SettingsViewModel @Inject constructor(
    private val authPreferences: AuthPreferences,
    private val authRepository: AuthRepository
) : ViewModel() {

    val userInfo: Flow<UserInfo> = authPreferences.userInfo

    fun logout() {
        viewModelScope.launch {
            authRepository.logout()
        }
    }
}
