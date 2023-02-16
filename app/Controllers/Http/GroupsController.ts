import type { HttpContextContract } from '@ioc:Adonis/Core/HttpContext'
import BadRequest from 'App/Exceptions/BadRequestException'
import Group from 'App/Models/Group'
import CreateGroup from 'App/Validators/CreateGroupValidator'

export default class GroupsController {

  public async index({ request, response }: HttpContextContract) {
    const { text, ['user']: userId } = request.qs()

    const page = request.input('page', 1)
    const limit = request.input('limit', 5)

    const groupsQuery = this.filterByQueryString(userId, text)
    const groups = await groupsQuery.paginate(page, limit)

    //const groups = await this.filterByQueryString(userId, text)
    /*
        let groups = [] as any
        if (!userId) {
          if (!text) groups = await Group.query().preload('masterUser').preload('players')
          else groups = await Group.query()
            .preload('masterUser')
            .preload('players')
            .where('name', 'LIKE', `%${text}%`)
            .orWhere('description', 'LIKE', `%${text}%`)
        }
        else {
          if (!text)
            groups = await Group.query()
              .preload('masterUser')
              .preload('players')
              .whereHas('players', (query) => {
                query.where('id', userId)
              })
          else groups = await Group.query()
            .preload('masterUser')
            .preload('players')
            .whereHas('players', (query) => {
              query.where('id', userId)
            })
            .where('name', 'LIKE', `%${text}%`)
            .orWhere('description', 'LIKE', `%${text}%`)
        }
        */
    return response.ok({ groups })
  }

  public async store({ request, response }: HttpContextContract) {
    const groupPayload = await request.validate(CreateGroup)
    const group = await Group.create(groupPayload)

    await group.related('players').attach([groupPayload.master])
    await group.load('players')

    return response.created({ group })
  }

  public async update({ request, response, bouncer }: HttpContextContract) {
    const id = request.param('id') as number
    const payload = request.all()

    const group = await Group.findOrFail(id)

    await bouncer.authorize('updateGroup', group)

    const updatedGroup = await group.merge(payload).save()

    return response.ok({ group: updatedGroup })
  }

  public async removePlayer({ request, response }: HttpContextContract) {
    const groupId = request.param('groupId') as number
    const playerId = +request.param('playerId') as number

    const group = await Group.findOrFail(groupId)

    if (playerId === group.master) throw new BadRequest('cannot remove master from group', 400)
    await group.related('players').detach([playerId])

    return response.ok({})
  }

  public async destroy({ request, response, bouncer }: HttpContextContract) {
    const id = request.param('id')
    const group = await Group.findOrFail(id)

    await bouncer.authorize('deleteGroup', group)

    //await group.related('players').detach()
    await group.delete()

    return response.ok({})
  }

  private filterByQueryString(userId: number, text: string) {
    if (userId && text) return this.filterByUserAndText(userId, text)
    else if (userId) return this.filterByUser(userId)
    else if (text) return this.filterByText(text)
    else return this.all()
  }

  private filterByUserAndText(userId: number, text: string) {
    return Group.query()
      .preload('masterUser')
      .preload('players')
      .withScopes((scope) => scope.withPlayer(userId))
      .withScopes((scope) => scope.withNameOrDescription(text))
  }

  private filterByUser(userId: number) {
    return Group.query()
      .preload('masterUser')
      .preload('players')
      .withScopes((scope) => scope.withPlayer(userId))
  }

  private filterByText(text: string) {
    return Group.query()
      .preload('masterUser')
      .preload('players')
      .withScopes((scope) => scope.withNameOrDescription(text))
  }

  private all() {
    return Group.query().preload('masterUser').preload('players')
  }
}
