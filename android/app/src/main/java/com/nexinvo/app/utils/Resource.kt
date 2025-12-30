package com.nexinvo.app.utils

sealed class Resource<T>(
    val data: T? = null,
    val message: String? = null,
    val code: Int? = null
) {
    class Success<T>(data: T) : Resource<T>(data)
    class Error<T>(message: String, code: Int? = null, data: T? = null) : Resource<T>(data, message, code)
    class Loading<T>(data: T? = null) : Resource<T>(data)
}
