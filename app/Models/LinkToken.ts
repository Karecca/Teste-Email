import { BaseModel, BelongsTo, belongsTo, column } from '@ioc:Adonis/Lucid/Orm'
import { DateTime } from 'luxon'

import User from './User'

export default class LinkToken extends BaseModel {
  @column({ isPrimary: true })
  public id: number

  @column()
  public token: string

  @column({ columnName: 'user_id' })
  public userId: number

  @belongsTo(() => {
    foreignKey: 'userId'
  })
  public user: BelongsTo<typeof User>

  @column.dateTime({ autoCreate: true })
  public createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  public updatedAt: DateTime
}
