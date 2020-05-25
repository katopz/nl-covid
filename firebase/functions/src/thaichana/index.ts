// import * as bigquery from '@google-cloud/bigquery'
import * as admin from 'firebase-admin'
// import md5 from 'md5'
import fetch from 'node-fetch'

// Location
// const REGION = 'asia-northeast1' // JP (There's no SG for cloud function)

// Admin service account key
const serviceAccount = require('../../.credential.json')
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  storageBucket: 'nl-covid.appspot.com'
})

// Params
// https://api-customer.thaichana.com/shop/0001/S0000000004
const API_URL = 'https://api-customer.thaichana.com/shop/0001/S'
const SEARCH_URL = 'https://api-search.thaichana.com/shop/search'

const pull = async (cursor: number) => {
  // get shop name
  const shop_url = `${API_URL}${'0000000000'.slice(0, 10 - cursor.toString().length) + cursor}`
  console.log(' * fetch : ', shop_url)

  const response = await fetch(shop_url, { method: 'GET' })
  const _json = await response.json()
  const { shopName, shopId, appId } = _json

  // get shop detail
  console.log('shopName:', shopName)
  const body = {
    nameQuery: shopName,
    location: { latitude: 13.778944, longitude: 100.64363519999999 },
    size: 10,
    sortBy: 'LOCATION_NEAR'
  }

  const search_response = await fetch(SEARCH_URL, {
    method: 'POST',
    headers: {
      accept: 'application/json, text/plain, */*',
      'accept-language': 'en-US,en;q=0.9,th;q=0.8',
      'cache-control': 'no-cache',
      'content-type': 'application/json;charset=UTF-8',
      pragma: 'no-cache',
      'sec-fetch-mode': 'cors',
      'sec-fetch-site': 'same-site'
    },
    body: JSON.stringify(body)
  })

  // const search_response = await fetch('https://api-search.thaichana.com/shop/search', {
  //   headers: {
  //     accept: 'application/json, text/plain, */*',
  //     'accept-language': 'en-US,en;q=0.9,th;q=0.8',
  //     'cache-control': 'no-cache',
  //     'content-type': 'application/json;charset=UTF-8',
  //     pragma: 'no-cache',
  //     'sec-fetch-mode': 'cors',
  //     'sec-fetch-site': 'same-site'
  //   },
  //   referrer:
  //     'https://merchant.thaichana.com/search?size=10&page=0&merchantName=salisa%2F%E0%B9%80%E0%B8%AA%E0%B8%A3%E0%B8%B4%E0%B8%A1%E0%B8%AA%E0%B8%A7%E0%B8%A2%2F%E0%B8%AD%E0%B8%B1%E0%B8%A1%E0%B8%A3%E0%B8%B4%E0%B8%99%E0%B8%97%E0%B8%A3%E0%B9%8C%E0%B8%9E%E0%B8%A5%E0%B8%B2%E0%B8%8B%E0%B9%88%E0%B8%B2&category=%E0%B8%97%E0%B8%B8%E0%B8%81%E0%B8%9B%E0%B8%A3%E0%B8%B0%E0%B9%80%E0%B8%A0%E0%B8%97&province=%E0%B9%83%E0%B8%81%E0%B8%A5%E0%B9%89%E0%B8%89%E0%B8%B1%E0%B8%99&rating=0&passQuestionnaire=false&lockLatLong=false',
  //   referrerPolicy: 'no-referrer-when-downgrade',
  //   body:
  //     '{"nameQuery":"ร้านหนำกันเอง","location":{"latitude":13.778944,"longitude":100.64363519999999},"size":10,"sortBy":"LOCATION_NEAR"}',
  //   method: 'POST',
  //   mode: 'cors'
  // })

  const search_response_json = await search_response.json()
  console.log('---------------------------')
  console.log(search_response_json)
  console.log('---------------------------')
  const { shops } = search_response_json

  // Find shop
  let shop
  shop = shops.filter((e: any) => e.shopName === shopName)[0]

  if (shop) {
    console.log('FOUND shopId: ', shop.id)
    shop.shopId = shopId
    shop.appId = appId
    return shop
  } else {
    console.log('NOT FOUND: ', shopName)
    return _json
  }
}

export const ingest_firestore = async () => {
  // Read latest cursor
  const ref = admin.firestore().collection('thaichana')
  const metaRef = ref.doc('meta')
  const get_res = await metaRef.get()
  const get_resData = get_res.data() as any
  const cursor = get_resData?.cursor || 1
  const next_cursor = cursor + 10
  const batch = admin.firestore().batch()

  // loop 100
  for (let i = cursor; i < next_cursor; i++) {
    const data = await pull(i)
    batch.set(ref.doc(), data, { merge: true })
  }

  batch.set(metaRef, { cursor: next_cursor }, { merge: true })
  await batch.commit()
  console.log(' ! done : ', next_cursor)
}

const transform = (value: any) => {
  if (typeof value === 'string') {
    return `"${value}"`
  } else if (value === null || value === undefined) {
    return null
  } else {
    return value
  }
}

const _ingest_csv = async (step: number) => {
  // --------------------------------------------------------------------------------------------

  // Read latest cursor
  const folder = 'thaichana2'
  const ref = admin.firestore().collection('thaichana')
  const metaRef = ref.doc('meta')
  const get_res = await metaRef.get()
  const get_resData = get_res.data() as any
  const cursor = get_resData?.cursor || 1

  const next_cursor = cursor + step
  const batch = admin.firestore().batch()

  // --------------------------------------------------------------------------------------------

  // loop
  let csv_header = ''
  let csv_data = ''
  let not_found = 0
  for (let i = cursor; i < next_cursor; i++) {
    const _json = await pull(i)

    // EOF
    if (_json.status === 'error') {
      if (not_found++ > 100) throw new Error('NOT_FOUND:' + i)
    }

    // fixed schema
    const json = {
      ...{
        id: null,
        shopId: null,
        appId: null,
        businessType: null,
        capacity: null,
        category: null,
        groupType: null,
        latitude: null,
        longitude: null,
        ratingScore: null,
        shopName: null,
        subcategory: null
      },
      ..._json
    }

    // nested
    json.address = {
      ...{
        zipCode: null,
        province: null,
        addressNo: null,
        street: null,
        provinceCode: null,
        district: null,
        moo: null,
        soi: null,
        subDistrict: null,
        building: null
      },
      ..._json.address
    }
    // nested
    json.stats = {
      ...{ remain: null, density: null },
      ..._json.stats
    }

    // console.log('--------------------------')
    // console.log(Object.keys(json).length)
    // console.log(Object.keys(json.address).length)
    // if (Object.keys(json.address).length < 10) throw new Error()
    // console.log('--------------------------')

    if (json.shopId) {
      delete json.disclaimer

      console.log('shopId : ', json.shopId)

      const json_flat = { ...json }
      delete json_flat.address
      delete json_flat.stats

      // header
      const json_flat_keys = Object.keys(json_flat).sort()
      const address_keys = Object.keys(json.address).sort()
      const address = address_keys.map(e => 'address_' + e)
      const stats_keys = Object.keys(json.stats).sort()
      const stats = stats_keys.map(e => 'stats_' + e)
      const header = json_flat_keys
        .concat(address)
        .concat(stats)
        .join(',')

      // data
      const data = json_flat_keys.map((e: any) => {
        const value = json[e]
        return transform(value)
      })

      // address
      const address_data = address_keys.map((e: any) => {
        const value = json.address[e]
        return transform(value)
      })

      // stats
      const stats_data = stats_keys.map((e: any) => {
        const value = json.stats[e]
        return transform(value)
      })

      const data_str = data
        .concat(address_data)
        .concat(stats_data)
        .join(',')

      csv_header = header
      csv_data += data_str + '\n'
    }
  }

  const csv_all_data = csv_header + '\n' + csv_data

  // --------------------------------------------------------------------------------------------

  const full_filename = `${folder}/${cursor}-${next_cursor - 1}.csv`
  await saveToBucket(full_filename, csv_all_data)

  // --------------------------------------------------------------------------------------------

  console.log(' ! done : ', full_filename)

  batch.set(metaRef, { cursor: next_cursor }, { merge: true })
  await batch.commit()

  console.log(' ! next_cursor : ', next_cursor)

  return next_cursor
}

const saveToBucket = async (full_filename: string, csv: string) => {
  console.log(' ^ full_filename:', full_filename)
  console.log(' ^ csv_all_data.length:', csv.length)
  const bucket = admin.storage().bucket()
  const file = bucket.file(full_filename)
  return file.save(csv)
}

export const ingest_csv = async () => {
  for (let i = 0; i < 50; i++) {
    await _ingest_csv(100)
  }
}
