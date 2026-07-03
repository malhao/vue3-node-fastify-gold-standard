import { http, HttpResponse } from 'msw'

export const API_ORIGIN = 'http://localhost:3000'

export const tasksListHandler = http.get(`${API_ORIGIN}/api/v1/tasks`, () =>
  HttpResponse.json({
    data: [],
    meta: { pagination: { nextCursor: null, hasMore: false, limit: 20 } },
  }),
)

export const handlers = [tasksListHandler]
