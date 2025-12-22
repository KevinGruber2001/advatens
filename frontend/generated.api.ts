import { makeApi, Zodios, type ZodiosOptions } from "@zodios/core";
import { z } from "zod";

type Orchard = {
  id: string;
  owner_id: string;
  name: string;
  stations?: Array<Station> | undefined;
};
type Station = {
  id: string;
  orchard_id: string;
  name: string;
  device_id: string;
};

const OrchardCreate = z
  .object({ name: z.string().min(2).max(32) })
  .strict()
  .passthrough();
const Station: z.ZodType<Station> = z
  .object({
    id: z.string().uuid(),
    orchard_id: z.string().uuid(),
    name: z.string(),
    device_id: z.string(),
  })
  .strict()
  .passthrough();
const Orchard: z.ZodType<Orchard> = z
  .object({
    id: z.string().uuid(),
    owner_id: z.string(),
    name: z.string().min(2).max(32),
    stations: z.array(Station).optional(),
  })
  .strict()
  .passthrough();
const Error = z
  .object({ code: z.number().int(), message: z.string() })
  .partial()
  .strict()
  .passthrough();
const OrchardUpdate = z
  .object({ name: z.string().min(2).max(32) })
  .partial()
  .strict()
  .passthrough();
const StationCreate = z
  .object({
    orchard_id: z.string().uuid(),
    name: z.string(),
    device_id: z.string(),
  })
  .strict()
  .passthrough();
const StationUpdate = z
  .object({ name: z.string(), device_id: z.string() })
  .partial()
  .strict()
  .passthrough();
const Metric = z
  .object({
    station_id: z.string().uuid(),
    metric_type: z.enum([
      "temperature",
      "soil_moisture",
      "ph",
      "battery_level",
    ]),
    timestamp: z.string(),
    value: z.number(),
  })
  .strict()
  .passthrough();

export const schemas = {
  OrchardCreate,
  Station,
  Orchard,
  Error,
  OrchardUpdate,
  StationCreate,
  StationUpdate,
  Metric,
};

const endpoints = makeApi([
  {
    method: "get",
    path: "/metrics",
    alias: "getMetrics",
    requestFormat: "json",
    parameters: [
      {
        name: "metric_type",
        type: "Query",
        schema: z.enum(["temperature", "soil_moisture", "ph", "battery_level"]),
      },
      {
        name: "station_id",
        type: "Query",
        schema: z.string().uuid(),
      },
      {
        name: "start_time",
        type: "Query",
        schema: z.string().optional(),
      },
      {
        name: "end_time",
        type: "Query",
        schema: z.string().optional(),
      },
    ],
    response: z.array(Metric),
    errors: [
      {
        status: 400,
        description: `Invalid parameter`,
        schema: Error,
      },
      {
        status: 401,
        description: `Unauthorized`,
        schema: Error,
      },
    ],
  },
  {
    method: "post",
    path: "/orchards",
    alias: "createOrchard",
    requestFormat: "json",
    parameters: [
      {
        name: "body",
        type: "Body",
        schema: z
          .object({ name: z.string().min(2).max(32) })
          .strict()
          .passthrough(),
      },
    ],
    response: Orchard,
    errors: [
      {
        status: 400,
        description: `Invalid input`,
        schema: Error,
      },
      {
        status: 401,
        description: `Unauthorized`,
        schema: Error,
      },
    ],
  },
  {
    method: "get",
    path: "/orchards",
    alias: "getOrchards",
    requestFormat: "json",
    response: z.array(Orchard),
    errors: [
      {
        status: 401,
        description: `Unauthorized`,
        schema: Error,
      },
    ],
  },
  {
    method: "get",
    path: "/orchards/:orchardId",
    alias: "getOrchard",
    requestFormat: "json",
    parameters: [
      {
        name: "orchardId",
        type: "Path",
        schema: z.string().uuid(),
      },
    ],
    response: Orchard,
    errors: [
      {
        status: 401,
        description: `Unauthorized`,
        schema: Error,
      },
      {
        status: 404,
        description: `Orchard not found`,
        schema: Error,
      },
    ],
  },
  {
    method: "patch",
    path: "/orchards/:orchardId",
    alias: "updateOrchard",
    requestFormat: "json",
    parameters: [
      {
        name: "body",
        type: "Body",
        schema: z
          .object({ name: z.string().min(2).max(32) })
          .partial()
          .strict()
          .passthrough(),
      },
      {
        name: "orchardId",
        type: "Path",
        schema: z.string().uuid(),
      },
    ],
    response: Orchard,
    errors: [
      {
        status: 400,
        description: `Invalid input`,
        schema: Error,
      },
      {
        status: 401,
        description: `Unauthorized`,
        schema: Error,
      },
      {
        status: 404,
        description: `Orchard not found`,
        schema: Error,
      },
    ],
  },
  {
    method: "delete",
    path: "/orchards/:orchardId",
    alias: "deleteOrchard",
    requestFormat: "json",
    parameters: [
      {
        name: "orchardId",
        type: "Path",
        schema: z.string().uuid(),
      },
    ],
    response: z.void(),
    errors: [
      {
        status: 401,
        description: `Unauthorized`,
        schema: Error,
      },
      {
        status: 404,
        description: `Orchard not found`,
        schema: Error,
      },
    ],
  },
  {
    method: "get",
    path: "/orchards/:orchardId/stations",
    alias: "getStationsByOrchard",
    requestFormat: "json",
    parameters: [
      {
        name: "orchardId",
        type: "Path",
        schema: z.string().uuid(),
      },
    ],
    response: z.array(Station),
    errors: [
      {
        status: 401,
        description: `Unauthorized`,
        schema: Error,
      },
    ],
  },
  {
    method: "post",
    path: "/stations",
    alias: "createStation",
    requestFormat: "json",
    parameters: [
      {
        name: "body",
        type: "Body",
        schema: StationCreate,
      },
    ],
    response: Station,
    errors: [
      {
        status: 400,
        description: `Invalid input`,
        schema: Error,
      },
      {
        status: 401,
        description: `Unauthorized`,
        schema: Error,
      },
    ],
  },
  {
    method: "get",
    path: "/stations/:stationId",
    alias: "getStation",
    requestFormat: "json",
    parameters: [
      {
        name: "stationId",
        type: "Path",
        schema: z.string().uuid(),
      },
    ],
    response: Station,
    errors: [
      {
        status: 401,
        description: `Unauthorized`,
        schema: Error,
      },
      {
        status: 404,
        description: `Station not found`,
        schema: Error,
      },
    ],
  },
  {
    method: "patch",
    path: "/stations/:stationId",
    alias: "updateStation",
    requestFormat: "json",
    parameters: [
      {
        name: "body",
        type: "Body",
        schema: StationUpdate,
      },
      {
        name: "stationId",
        type: "Path",
        schema: z.string().uuid(),
      },
    ],
    response: Station,
    errors: [
      {
        status: 400,
        description: `Invalid input`,
        schema: Error,
      },
      {
        status: 401,
        description: `Unauthorized`,
        schema: Error,
      },
      {
        status: 404,
        description: `Station not found`,
        schema: Error,
      },
    ],
  },
  {
    method: "delete",
    path: "/stations/:stationId",
    alias: "deleteStation",
    requestFormat: "json",
    parameters: [
      {
        name: "stationId",
        type: "Path",
        schema: z.string().uuid(),
      },
    ],
    response: z.void(),
    errors: [
      {
        status: 401,
        description: `Unauthorized`,
        schema: Error,
      },
      {
        status: 404,
        description: `Station not found`,
        schema: Error,
      },
    ],
  },
]);

export const api = new Zodios("http://localhost:8888", endpoints);

export function createApiClient(baseUrl: string, options?: ZodiosOptions) {
  return new Zodios(baseUrl, endpoints, options);
}
