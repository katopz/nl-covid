import * as functions from 'firebase-functions'
import * as bigquery from '@google-cloud/bigquery'
import md5 from 'md5'

import { schema, TREND_FIELDS, WORLD_FIELDS, CASES_FIELDS } from './schema'

export const REGION = 'asia-northeast1'
export const BQ_LOCATION = 'asia-southeast1'
export const onRequest = functions.region(REGION).https.onRequest

export const _pullData = async () => {
  const bq = new bigquery.BigQuery()

  const isTableExist = async (datasetId: string, tableId: string) => {
    // Exist?
    const [tableExists] = await bq.dataset(datasetId).table(tableId).exists()

    if (tableExists) {
      // console.log(`Table ${tableId} already existed.`)

      return true
    }

    return false
  }

  const createTodayTable = async (datasetId: string, tableId: string) => {
    // Daily
    const today_tableId = `${tableId}_${new Date().toISOString().split('T')[0].split('-').join('')}`

    if (await isTableExist(datasetId, today_tableId)) {
      console.error(`------------------------------------------`)
      console.error(`Please empty ${datasetId}.${today_tableId}`)
      console.error(`------------------------------------------`)

      // return { today_tableId }
      throw new Error(`${datasetId}.${today_tableId} must be empty`)
    }

    const { tableId: _tableId } = await createTable(datasetId, today_tableId, tableId)
    if (!_tableId) return { today_tableId: null } as any

    return { today_tableId: _tableId }
  }

  const createTable = async (datasetId: string, tableId: string, type: string) => {
    if (await isTableExist(datasetId, tableId)) {
      // console.log(`Table ${tableId} already existed.`)
      return { tableId: null } as any
    }

    // console.log('createTable:', tableId)
    // console.log('type:', type)

    const options = { schema: schema[type] }

    // Create a new table in the dataset
    await bq.dataset(datasetId).createTable(tableId, options)

    // console.log(`Table ${tableId} created.`)

    return { tableId }
  }

  // Insert with deduplicate by `insertId`
  const insertRowsAsStreamWithInsertId = async (datasetId: string, tableId: string, json: any) => {
    console.log(` * Insert tableId: ${tableId}`)
    const type = tableId.split('_')[0]
    // console.log(`Insert type: ${type}`)
    const _rows: any = {
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
          // How about us now T-T
          if (e.name === 'Thailand') console.log(e)
          return {
            // Use value "name" as insertId
            insertId: md5(e.name),
            json: e
          }
        }),
      cases: () =>
        json.records.map((e: any) => {
          // Correct int
          e.age = Math.round(e.age)

          return {
            // Use "id" as insertId
            insertId: e.id,
            json: {
              ...e
              // references: e.references ? e.references.map((ee: string) => ({ url: ee })) : []
            }
          }
        })
    }

    const rows = _rows[type]()

    // Use raw because of `insertId`
    const options = {
      skipInvalidRows: false,
      raw: true
    }

    // Insert data into a table
    await bq.dataset(datasetId).table(tableId).insert(rows, options)

    console.log(` ^ Inserted ${rows.length} rows`)

    return
  }

  const getUniqueKey = (type: string) => {
    return ({ trend: 'date', world: 'name', cases: 'id' } as any)[type]
  }

  const getUpdateStatement = (type: string) => {
    // console.log(`Will update ${type}.`)

    return ({
      trend: TREND_FIELDS.map((e) => `${e}=S.${e}`),
      world: WORLD_FIELDS.map((e) => `${e}=S.${e}`),
      cases: CASES_FIELDS.map((e) => `${e}=S.${e}`)
    } as any)[type]
  }

  const getInsertStatement = (type: string) => {
    // console.log(`Will insert ${type}.`)

    const getINSERT = (target: string[]) => `INSERT (${target.join(',')})`
    const getVALUE = (target: string[]) => 'VALUES (' + target.map((e) => `S.${e}`).join(',') + ')'

    return ({
      trend: getINSERT(TREND_FIELDS) + ' ' + getVALUE(TREND_FIELDS),
      world: getINSERT(WORLD_FIELDS) + ' ' + getVALUE(WORLD_FIELDS),
      cases: getINSERT(CASES_FIELDS) + ' ' + getVALUE(CASES_FIELDS)
    } as any)[type]
  }

  const upsertTable = async (datasetId: string, source_tableId: string, target_tableId: string) => {
    console.log(` * Merge : ${source_tableId},  ${target_tableId}`)

    // Params
    const type = target_tableId
    const KEY = getUniqueKey(type)

    // Options
    const query = `
    MERGE nl-covid.${datasetId}.${target_tableId} T
    USING nl-covid.${datasetId}.${source_tableId} S
    ON T.${KEY} = S.${KEY}
    WHEN MATCHED THEN
      UPDATE SET ${getUpdateStatement(type)}
    WHEN NOT MATCHED THEN
      ${getInsertStatement(type)}
    `
    const location = BQ_LOCATION

    // console.log(query)

    // Run the query as a job
    const [job] = await bq.createQueryJob({
      query,
      location
    })

    //console.log(`Job ${job.id} started.`)

    // Wait for the query to finish
    await job.getQueryResults()
  }

  const start = async (path: string) => {
    console.log(`---------------------`)
    const paths = path.split('/')
    const tableId = path.includes('/') ? paths[1] : path
    console.log(` * Start : ${tableId}`)

    // Fetch
    const datasetId = 'covid19'
    const COVID_URL = `https://covid19-cdn.workpointnews.com/api/${path}.json`
    console.log(` * fetch : ${COVID_URL}`)
    const { getJSON } = require('@rabbotio/fetcher')
    const json = await getJSON(COVID_URL).catch(console.error)
    if (!json) throw new Error('No data')

    // Create table if not exists
    const { tableId: old_tableId } = await createTable(datasetId, tableId, tableId)
    old_tableId && console.log(` * Created : ${old_tableId}`)

    const { today_tableId } = await createTodayTable(datasetId, tableId)
    // test // const today_tableId = `${tableId}_20200321`
    if (today_tableId) {
      await insertRowsAsStreamWithInsertId(datasetId, today_tableId, json).catch((error) => {
        // Break if error
        // console.log(error.errors[0].errors[0])
        console.error(error)
        throw error
      })
      await upsertTable(datasetId, today_tableId, tableId)
    }
  }

  // Go!
  // trend, world, cases
  console.log(' * Ingest: workpoint')
  await start('trend').catch(console.error)
  await start('world').catch(console.error)
  await start('v2/cases').catch(console.error)
  console.log(' ! Done : workpoint')
}
