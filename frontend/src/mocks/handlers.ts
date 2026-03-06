import { http, HttpResponse } from "msw"
import { mockOrchards, allStations, mockMetrics } from "./data"

const BASE = "http://localhost:8888"

export const handlers = [
  // --- Orchards ---
  http.get(`${BASE}/orchards`, () => {
    return HttpResponse.json(mockOrchards)
  }),

  http.get(`${BASE}/orchards/:orchardId`, ({ params }) => {
    const orchard = mockOrchards.find((o) => o.id === params.orchardId)
    if (!orchard) return HttpResponse.json({ code: 404, message: "Orchard not found" }, { status: 404 })
    return HttpResponse.json(orchard)
  }),

  http.post(`${BASE}/orchards`, async ({ request }) => {
    const body = (await request.json()) as { name: string }
    const newOrchard = {
      id: crypto.randomUUID(),
      owner_id: "mock-user-001",
      name: body.name,
      stations: [],
    }
    mockOrchards.push(newOrchard)
    return HttpResponse.json(newOrchard, { status: 201 })
  }),

  http.patch(`${BASE}/orchards/:orchardId`, async ({ params, request }) => {
    const orchard = mockOrchards.find((o) => o.id === params.orchardId)
    if (!orchard) return HttpResponse.json({ code: 404, message: "Orchard not found" }, { status: 404 })
    const body = (await request.json()) as { name?: string }
    if (body.name) orchard.name = body.name
    return HttpResponse.json(orchard)
  }),

  http.delete(`${BASE}/orchards/:orchardId`, ({ params }) => {
    const idx = mockOrchards.findIndex((o) => o.id === params.orchardId)
    if (idx === -1) return HttpResponse.json({ code: 404, message: "Orchard not found" }, { status: 404 })
    mockOrchards.splice(idx, 1)
    return new HttpResponse(null, { status: 204 })
  }),

  // --- Stations by Orchard ---
  http.get(`${BASE}/orchards/:orchardId/stations`, ({ params }) => {
    const stations = allStations.filter((s) => s.orchard_id === params.orchardId)
    return HttpResponse.json(stations)
  }),

  // --- Stations ---
  http.post(`${BASE}/stations`, async ({ request }) => {
    const body = (await request.json()) as { orchard_id: string; name: string; device_id: string }
    const newStation = {
      id: crypto.randomUUID(),
      orchard_id: body.orchard_id,
      name: body.name,
      device_id: body.device_id,
    }
    allStations.push(newStation)
    const orchard = mockOrchards.find((o) => o.id === body.orchard_id)
    orchard?.stations?.push(newStation)
    return HttpResponse.json(newStation, { status: 201 })
  }),

  http.get(`${BASE}/stations/:stationId`, ({ params }) => {
    const station = allStations.find((s) => s.id === params.stationId)
    if (!station) return HttpResponse.json({ code: 404, message: "Station not found" }, { status: 404 })
    return HttpResponse.json(station)
  }),

  http.patch(`${BASE}/stations/:stationId`, async ({ params, request }) => {
    const station = allStations.find((s) => s.id === params.stationId)
    if (!station) return HttpResponse.json({ code: 404, message: "Station not found" }, { status: 404 })
    const body = (await request.json()) as { name?: string; device_id?: string }
    if (body.name) station.name = body.name
    if (body.device_id) station.device_id = body.device_id
    return HttpResponse.json(station)
  }),

  http.delete(`${BASE}/stations/:stationId`, ({ params }) => {
    const idx = allStations.findIndex((s) => s.id === params.stationId)
    if (idx === -1) return HttpResponse.json({ code: 404, message: "Station not found" }, { status: 404 })
    allStations.splice(idx, 1)
    return new HttpResponse(null, { status: 204 })
  }),

  // --- Metrics ---
  http.get(`${BASE}/metrics`, ({ request }) => {
    const url = new URL(request.url)
    const stationId = url.searchParams.get("station_id")
    const metricType = url.searchParams.get("metric_type")
    const startTime = url.searchParams.get("start_time")
    const endTime = url.searchParams.get("end_time")

    if (!stationId || !metricType) {
      return HttpResponse.json({ code: 400, message: "station_id and metric_type are required" }, { status: 400 })
    }

    const key = `${stationId}:${metricType}`
    let metrics = mockMetrics[key] ?? []

    if (startTime) {
      const start = new Date(startTime).getTime()
      metrics = metrics.filter((m) => new Date(m.timestamp).getTime() >= start)
    }
    if (endTime) {
      const end = new Date(endTime).getTime()
      metrics = metrics.filter((m) => new Date(m.timestamp).getTime() <= end)
    }

    return HttpResponse.json(metrics)
  }),
]
