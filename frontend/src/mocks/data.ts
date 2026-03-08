// Mock data fixtures for decoupled frontend development

const STATION_IDS = {
  alpine1: "a1b2c3d4-1111-4000-a000-000000000001",
  alpine2: "a1b2c3d4-1111-4000-a000-000000000002",
  alpine3: "a1b2c3d4-1111-4000-a000-000000000003",
  valley1: "a1b2c3d4-2222-4000-a000-000000000001",
  valley2: "a1b2c3d4-2222-4000-a000-000000000002",
} as const

const ORCHARD_IDS = {
  alpine: "f47ac10b-58cc-4372-a567-0e02b2c3d479",
  valley: "6ba7b810-9dad-11d1-80b4-00c04fd430c8",
} as const

export const mockStations = {
  alpine: [
    { id: STATION_IDS.alpine1, orchard_id: ORCHARD_IDS.alpine, name: "North Slope Sensor", device_id: "dev-001-north" },
    { id: STATION_IDS.alpine2, orchard_id: ORCHARD_IDS.alpine, name: "South Ridge Sensor", device_id: "dev-002-south" },
    { id: STATION_IDS.alpine3, orchard_id: ORCHARD_IDS.alpine, name: "Creek Bed Sensor", device_id: "dev-003-creek" },
  ],
  valley: [
    { id: STATION_IDS.valley1, orchard_id: ORCHARD_IDS.valley, name: "Main Field Sensor", device_id: "dev-004-main" },
    { id: STATION_IDS.valley2, orchard_id: ORCHARD_IDS.valley, name: "Greenhouse Sensor", device_id: "dev-005-green" },
  ],
}

export const mockOrchards = [
  {
    id: ORCHARD_IDS.alpine,
    owner_id: "mock-user-001",
    name: "Alpine Orchard",
    stations: mockStations.alpine,
  },
  {
    id: ORCHARD_IDS.valley,
    owner_id: "mock-user-001",
    name: "Valley Orchard",
    stations: mockStations.valley,
  },
]

export const allStations = [...mockStations.alpine, ...mockStations.valley]

// Generate realistic time-series metric data (7 days of hourly data)
function generateMetrics(
  stationId: string,
  metricType: string,
  count: number = 168 // 7 days * 24 hours
) {
  const now = Date.now()
  const hourMs = 60 * 60 * 1000

  const ranges: Record<string, { base: number; variance: number }> = {
    temperature: { base: 18, variance: 8 },
    soil_moisture: { base: 45, variance: 15 },
    ph: { base: 6.5, variance: 0.8 },
    battery_level: { base: 85, variance: 10 },
  }

  const { base, variance } = ranges[metricType] ?? { base: 50, variance: 10 }

  return Array.from({ length: count }, (_, i) => ({
    station_id: stationId,
    metric_type: metricType,
    timestamp: new Date(now - (count - i) * hourMs).toISOString(),
    value: Math.round((base + (Math.random() - 0.5) * 2 * variance) * 100) / 100,
  }))
}

// Pre-generate metrics for every station + metric type combination
const metricTypes = ["temperature", "soil_moisture", "ph", "battery_level"] as const

export const mockMetrics: Record<string, ReturnType<typeof generateMetrics>> = {}

for (const station of allStations) {
  for (const type of metricTypes) {
    mockMetrics[`${station.id}:${type}`] = generateMetrics(station.id, type)
  }
}
