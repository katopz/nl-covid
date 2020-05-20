import { ingest_csv } from './thaichana'

export const REGION = 'asia-northeast1'

// Cloud Schedule → Cloud Function : Call ingest daily
// https://firebase.google.com/docs/functions/schedule-functions

// export const ingest_thaichana = functions
//   .region(REGION)
//   .pubsub.schedule('every day 14:00')
//   .timeZone('Asia/Bangkok')
//   .onRun(async () => {
//     console.info(' * Ingest begin at : ', new Date())
//     await ingest().catch(error => console.error(error.response ? JSON.stringify(error.response) : error))
//     console.info(' * Ingest end at : ', new Date())
//   })

const _run = async () => await ingest_csv()

let error_count = 0
const _loop = () => {
  _run().catch(err => {
    console.error(err)
    if (error_count++ < 100) setTimeout(_loop, 3000)
  })
}

_loop()
