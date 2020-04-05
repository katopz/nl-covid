import * as functions from 'firebase-functions'

import { _pullData } from './workpoint/'
import { _ingestAll } from './tcgd/'

export const REGION = 'asia-northeast1'

// Cloud Schedule → Cloud Function : Call ingest daily
// https://firebase.google.com/docs/functions/schedule-functions

export const ingest = functions
  .region(REGION)
  .pubsub.schedule('every monday 15:00')
  .timeZone('Asia/Bangkok')
  .onRun(async () => {
    console.info(' * Ingest start at : ', new Date())
    await _pullData().catch(error => console.error(error.response ? JSON.stringify(error.response) : error))
    await _ingestAll().catch(error => console.error(error.response ? JSON.stringify(error.response) : error))
    console.info(' * Ingest done at : ', new Date())
  })
