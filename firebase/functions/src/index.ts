import * as functions from 'firebase-functions'

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
  const { BigQuery } = require('@google-cloud/bigquery')
  const { md5 } = require('md5')
  const bq = new BigQuery()

  const createTable = async (datasetId: string, tableId: string) => {
    // Exist?
    const [tables] = await bq.dataset(datasetId).getTables()
    let isExist = false
    tables.forEach((table: any) => {
      isExist = isExist || tableId === table.id
    })

    if (isExist) {
      console.log(`Table ${tableId} already existed.`)
      return
    }

    const schema: any = {
      trend: 'date:date, deaths:integer, confirmed:integer, recovered:integer',
      world:
        'name:string, alpha2:string, alpha3:string, numeric:string, deaths:integer, confirmed:integer, recovered:integer, travel:string',
      cases: [
        { name: 'id', type: 'STRING', mode: 'NULLABLE' },
        { name: 'number', type: 'INTEGER', mode: 'NULLABLE' },
        { name: 'age', type: 'INTEGER', mode: 'NULLABLE' },
        { name: 'gender', type: 'STRING', mode: 'NULLABLE' },
        { name: 'job', type: 'STRING', mode: 'NULLABLE' },
        { name: 'origin', type: 'STRING', mode: 'NULLABLE' },
        { name: 'type', type: 'STRING', mode: 'NULLABLE' },
        { name: 'meta', type: 'STRING', mode: 'NULLABLE' },
        { name: 'status', type: 'STRING', mode: 'NULLABLE' },
        { name: 'statementDate', type: 'DATE', mode: 'NULLABLE' },
        { name: 'recoveredDate', type: 'DATE', mode: 'NULLABLE' },
        { name: 'nationality', type: 'STRING', mode: 'NULLABLE' },
        { name: 'detectedAt', type: 'STRING', mode: 'NULLABLE' },
        { name: 'treatAt', type: 'STRING', mode: 'NULLABLE' },
        {
          name: 'references',
          type: 'RECORD',
          mode: 'REPEATED',
          fields: [
            {
              name: 'url',
              type: 'STRING',
              mode: 'NULLABLE'
            }
          ]
        }
      ]
    }

    const options = { schema: schema[tableId] }

    // Create a new table in the dataset
    await bq.dataset(datasetId).createTable(tableId, options)

    console.log(`Table ${tableId} created.`)
  }

  // Insert with deduplicate by `insertId`
  const insertRowsAsStream = async (datasetId: string, tableId: string, json: any) => {
    let _rows: any = {
      trend: () =>
        Object.keys(json).map((e: string) => ({
          ...json[e],
          date: bq.date(e),
          // Use key "date" as insertId
          insertId: md5(e)
        })),
      world: () =>
        json.statistics.map((e: any) => ({
          // Use value "name" as insertId
          insertId: md5(e.name)
        })),
      cases: () =>
        json.map((e: any) => ({
          ...e,
          statementDate: e.statementDate ? bq.date(e.statementDate) : null,
          recoveredDate: e.recoveredDate ? bq.date(e.recoveredDate) : null,
          references: e['references'].map((ee: string) => ({ url: ee })),
          // Use "id" as insertId
          insertId: e.id
        }))
    }

    const rows = _rows[tableId]()

    // Insert data into a table
    await bq
      .dataset(datasetId)
      .table(tableId)
      .insert(rows)

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
    await createTable(datasetId, tableId)
    await insertRowsAsStream(datasetId, tableId, json)
  }

  // Go!
  // trend, world, cases
  await start('trend')
  await start('world')
  await start('cases')
}

_pullData()
