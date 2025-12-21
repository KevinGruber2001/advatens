import axios, { AxiosHeaders } from "axios"
import { useAuth } from "@clerk/clerk-react"
import React from "react"

import { createApiClient } from "../../generated.api"

export function useAxiosWithAuth() {
  const { getToken } = useAuth()

  return React.useMemo(() => {
    const instance = axios.create({
      baseURL: "http://localhost:8888",
    })

    instance.interceptors.request.use(async (config) => {
      const token = await getToken()
      if (token) {
        config.headers = new AxiosHeaders(config.headers)
        config.headers.set("Authorization", `Bearer ${token}`)
      }
      return config
    })

    return instance
  }, [getToken])
}

export function useApiClient() {
  const axiosInstance = useAxiosWithAuth()

  return React.useMemo(
    () => createApiClient("http://localhost:8888", { axiosInstance }),
    [axiosInstance]
  )
}
