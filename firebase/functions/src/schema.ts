// https://github.com/firebase/extensions/blob/next/firestore-bigquery-export/firestore-bigquery-change-tracker/src/bigquery/schema.ts
/*
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    https://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

export type BigQueryFieldMode = 'NULLABLE' | 'REPEATED' | 'REQUIRED'
export type BigQueryFieldType = 'BOOLEAN' | 'INTEGER' | 'RECORD' | 'STRING' | 'DATE'
export type BigQueryField = {
  fields?: BigQueryField[]
  mode: BigQueryFieldMode
  name: string
  type: BigQueryFieldType
}

export const bigQueryField = (
  name: string,
  type: BigQueryFieldType,
  mode?: BigQueryFieldMode,
  fields?: BigQueryField[]
): BigQueryField => ({
  fields,
  mode: mode || 'NULLABLE',
  name,
  type
})
