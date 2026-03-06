import axios, { AxiosHeaders } from "axios"
import { useAuth } from "@clerk/clerk-react"
import { useMockAuth } from "../mocks/MockClerkProvider"
import React from "react"

import { createApiClient } from "../../generated.api"

const IS_MOCK = import.meta.env.VITE_MOCK === "true"

export function useAxiosWithAuth() {
  const { getToken } = IS_MOCK ? useMockAuth() : useAuth()

  return React.useMemo(() => {
    const instance = axios.create({
      baseURL: import.meta.env.VITE_API_BASE_URL || "http://localhost:8888",
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
    () => createApiClient(import.meta.env.VITE_API_BASE_URL || "http://localhost:8888", { axiosInstance }),
    [axiosInstance]
  )
}
