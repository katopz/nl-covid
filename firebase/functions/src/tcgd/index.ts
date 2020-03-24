import * as functions from 'firebase-functions'
import * as bigquery from '@google-cloud/bigquery'
import * as admin from 'firebase-admin'
import md5 from 'md5'
import fetch from 'node-fetch'

// Location
const REGION = 'asia-northeast1' // JP (There's no SG for cloud function)

// Admin service account key
const serviceAccount = require('../../.credential.json')
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  storageBucket: 'nl-covid.appspot.com'
})

// Params
const LAB_URL = 'https://raw.githubusercontent.com/COVID19-TCDG/datasets/master/datasets/5lab.csv'
const THSTAT_URL = 'https://github.com/COVID19-TCDG/datasets/raw/master/datasets/thstat.csv'

const ingest = async (url: string) => {
  // Read ETag from Firebase
  // https://firebase.google.com/docs/firestore/query-data/get-data
  const get_res = await admin
    .firestore()
    .collection('covid19')
    .doc(md5(url))
    .get()
  console.log(' ^ get_res:', get_res.data())
  const get_resData = get_res.data() as any
  const etag = get_resData?.etag
  console.log(' ^ etag:', etag)

  // --------------------------------------------------------------------------------------------

  // Github → Cloud Function : Fetch file from github with ETag
  // https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/ETag
  let options = etag ? { headers: { 'If-None-Match': etag } } : {}
  const fetch_res = await fetch(url, options)
  console.log(' ^ fetch_res:', fetch_res.status)

  // Not modified
  if (fetch_res.status === 304) {
    console.log('Not modified:', url)
    return
  }

  const new_etag = fetch_res.headers.get('ETag')
  console.log(' ^ new_etag:', new_etag)

  // --------------------------------------------------------------------------------------------

  // Cloud Function → Firestore : Save url/e-tag to Firestore
  // https://firebase.google.com/docs/firestore/manage-data/add-data
  const set_res = (await admin
    .firestore()
    .collection('covid19')
    .doc(md5(url))
    .set({ etag: new_etag })) as any
  console.log(' ^ set_res:', set_res)

  // --------------------------------------------------------------------------------------------

  // Cloud Function → Cloud Storage : Upload file to GCS
  // https://firebase.google.com/docs/storage/admin/start
  // https://googleapis.dev/nodejs/storage/latest/File.html#createWriteStream
  const csv_filename = url
    .split('/')
    .pop()
    ?.split('.')
    .shift()

  if (!csv_filename) throw new Error(`Wrong csv filename: ${csv_filename}`)

  const daily_filename = `${csv_filename}${new Date()
    .toISOString()
    .split('T')[0]
    .split('-')
    .join('')}`
  const filetype = 'csv'
  const full_filename = `${daily_filename}.${filetype}`

  console.log(' ^ daily_filename:', daily_filename)
  console.log(' ^ full_filename:', full_filename)

  const bucket = admin.storage().bucket()
  const file = bucket.file(full_filename)

  // Write stream
  const buffer = await fetch_res.buffer()
  const write = () =>
    new Promise((resolve, reject) => {
      const blobStream = file.createWriteStream({
        metadata: {
          contentType: 'text/csv'
        }
      })

      blobStream.on('error', reject)
      blobStream.on('finish', () => resolve('OK'))

      blobStream.end(buffer)
    })

  const res_write = await write()
  console.log(' ^ res_write:', res_write)

  // --------------------------------------------------------------------------------------------

  // Cloud Storage → BigQuery : Ingest CSV to BigQuery
  // https://cloud.google.com/bigquery/docs/loading-data-cloud-storage-csv

  // Imports a GCS file into a table with manually defined schema.
  const datasetId = 'tcgd'
  const tableId = daily_filename

  // Configure the load job. For full list of options, see:
  // https://cloud.google.com/bigquery/docs/reference/rest/v2/Job#JobConfigurationLoad
  const metadata = {
    sourceFormat: 'CSV',
    skipLeadingRows: 1,
    // Currently, schema auto-detect cannot detect geography columns.
    autodetect: true,
    location: REGION
  }

  // Load data from a Google Cloud Storage file into the table
  const bq = new bigquery.BigQuery()
  const [job] = await bq
    .dataset(datasetId)
    .table(tableId)
    .load(bucket.file(full_filename), metadata)

  // load() waits for the job to finish
  console.log(`Job ${job.id} completed.`)

  // Check the job's status for errors
  const errors = job.status?.errors
  if (errors && errors.length > 0) throw errors
}

// Manually call
const _ingestAll = async () => {
  await ingest(LAB_URL)
  await ingest(THSTAT_URL)
}

_ingestAll()

// Cloud Schedule → Cloud Function : Call ingest daily
// https://firebase.google.com/docs/functions/schedule-functions

export const ingestAll = functions
  .region(REGION)
  .pubsub.schedule('every 24 hours')
  .onRun(async () => {
    console.log('This will be run every 24 hours!')
    return _ingestAll()
  })
