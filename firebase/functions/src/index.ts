import * as functions from 'firebase-functions'
import * as bigquery from '@google-cloud/bigquery'
import md5 from 'md5'

import { schema } from './schema'

export const REGION = 'asia-northeast1'
export const onRequest = functions.region(REGION).https.onRequest

export const pullData = onRequest((request, response) => {
  _pullData()
    .then(() => {
      response.status(200).send('OK')
    })
    .catch((error: Error) => {
      console.error(error)
      response.status(500)
    })
})

export const _pullData = async () => {
  const bq = new bigquery.BigQuery()

  const createTable = async (datasetId: string, tableId: string) => {
    // Exist?
    const [tableExists] = await bq
      .dataset(datasetId)
      .table(tableId)
      .exists()

    if (tableExists) {
      console.log(`Table ${tableId} already existed.`)

      return
    }

    const options = { schema: schema[tableId] }

    // Create a new table in the dataset
    await bq.dataset(datasetId).createTable(tableId, options)

    console.log(`Table ${tableId} created.`)
  }

  // Insert with deduplicate by `insertId`
  const insertRowsAsStreamWithInsertId = async (datasetId: string, tableId: string, json: any) => {
    console.log(`Insert : ${tableId}`)
    let _rows: any = {
      trend: () =>
        Object.keys(json).map((e: string) => ({
          // Use key "date" as insertId
          insertId: md5(e),
          json: {
            ...json[e],
            date: e
          }
        })),
      world: () =>
        json.statistics.map((e: any) => {
          if (e.name === 'Thailand') console.log(e)
          return {
            // Use value "name" as insertId
            insertId: md5(e.name),
            json: e
          }
        }),
      cases: () =>
        json.map((e: any) => ({
          // Use "id" as insertId
          insertId: e.id,
          json: {
            ...e,
            references: e.references ? e.references.map((ee: string) => ({ url: ee })) : []
          }
        }))
    }

    let rows = _rows[tableId]()

    // Use raw because of `insertId`
    const options = {
      skipInvalidRows: false,
      raw: true
    }

    // Insert data into a table
    await bq
      .dataset(datasetId)
      .table(tableId)
      .insert(rows, options)

    console.log(`Inserted ${rows.length} rows`)

    return
  }

  const start = async (tableId: string) => {
    // Fixed
    const datasetId = 'covid19'

    const { getJSON } = require('@rabbotio/fetcher')
    const COVID_URL = `https://covid19.workpointnews.com/api/${tableId}`
    const json = await getJSON(COVID_URL)

    // Cool
    await createTable(datasetId, tableId).catch(console.error)
    await insertRowsAsStreamWithInsertId(datasetId, tableId, json)
  }

  // Go!
  // trend, world, cases
  await start('trend')
  await start('world')
  await start('cases')
}

_pullData().catch(error => console.error(JSON.stringify(error.response)))
