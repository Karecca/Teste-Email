import Database from '@ioc:Adonis/Lucid/Database';
import { test } from '@japa/runner';
import GroupRequest from 'App/Models/GroupRequest';
import { GroupFactory, UserFactory } from 'Database/factories';

test.group('group request', (group) => {
  group.each.setup(async () => {
    await Database.beginGlobalTransaction()

    return () => Database.rollbackGlobalTransaction()
  })

  test('Deve criar a requisição de mesa', async ({ client, assert }) => {
    const user = await UserFactory.create()
    const group = await GroupFactory.merge({ master: user.id }).create()
    const response = await client.post(`/groups/${user.id}/requests`).json(group).loginAs(user)

    response.assertStatus(201)
    assert.exists(response.body().groupRequest, 'GroupRequest Undefined')
    assert.equal(response.body().groupRequest.userId, user.id)
    assert.equal(response.body().groupRequest.groupId, group.id)
    assert.equal(response.body().groupRequest.status, 'PENDING')
  })

  test('Deve retornar 409 quando uma requisição já existe', async ({ client, assert }) => {
    const user = await UserFactory.create()
    const group = await GroupFactory.merge({ master: user.id }).create()
    await client.post(`/groups/${user.id}/requests`).json(group).loginAs(user)

    const response = await client.post(`/groups/${user.id}/requests`).json(group).loginAs(user)

    response.assertStatus(409)

    assert.equal(response.body().code, 'BAD_REQUEST')
    assert.equal(response.body().status, 409)

  })

  test('Deve retornar 422 quando o usuario já faz parte do group', async ({ client, assert }) => {
    const user = await UserFactory.create()
    const groupPayload = {
      name: 'test',
      description: 'test',
      schedule: 'test',
      location: 'test',
      chronic: 'test',
      master: user.id,
    }

    const response = await client.post(`/groups`).json(groupPayload).loginAs(user)
    const newResponse = await client.post(`/groups/${response.body().group.id}/requests`).json(group).loginAs(user)

    newResponse.assertStatus(422)

    assert.equal(newResponse.body().code, 'BAD_REQUEST')
    assert.equal(newResponse.body().status, 422)
  })

  test('Deve retornar a lista de requisições por mestre', async ({ client, assert }) => {
    const master = await UserFactory.create()
    const group = await GroupFactory.merge({ master: master.id }).create()

    const responseGroup = await client.post(`/groups/${group.id}/requests`).json({}).loginAs(master)
    const groupRequest = responseGroup.body().groupRequest

    const response = await client.get(`/groups/${group.id}/requests?master=${master.id}`).loginAs(master)

    response.assertStatus(200)

    assert.exists(response.body().groupRequests, 'GroupRequests Undefined')
    assert.equal(response.body().groupRequests.length, 1)
    assert.equal(response.body().groupRequests[0].id, groupRequest.id)
    assert.equal(response.body().groupRequests[0].userId, groupRequest.userId)
    assert.equal(response.body().groupRequests[0].groupId, groupRequest.groupId)
    assert.equal(response.body().groupRequests[0].status, groupRequest.status)
    assert.equal(response.body().groupRequests[0].group.name, group.name)
    assert.equal(response.body().groupRequests[0].user.username, master.username)
    assert.equal(response.body().groupRequests[0].group.master, master.id)

  })

  test('Deve retornar uma lista vazia quando o mestre não está no grupo', async ({ client, assert }) => {
    const master = await UserFactory.create()
    const user = await UserFactory.create()
    const group = await GroupFactory.merge({ master: master.id }).create()

    await client.post(`/groups/${group.id}/requests`).json({}).loginAs(user)

    const response = await client.get(`/groups/${group.id}/requests?master=${user.id}`).loginAs(user)

    response.assertStatus(200)

    assert.exists(response.body().groupRequests, 'GroupRequests Undefined')
    assert.equal(response.body().groupRequests.length, 0)
  })

  test('Deve retornar 422 quando o mestre não é informado', async ({ client, assert }) => {
    const user = await UserFactory.create()
    const group = await GroupFactory.merge({ master: user.id }).create()


    const response = await client.get(`/groups/${group.id}/requests`).loginAs(user)

    response.assertStatus(422)

    assert.exists(response.body().code, 'BAD_REQUEST')
    assert.equal(response.body().status, 422)
  })

  test('Deve aceitar uma requisição de grupo', async ({ client, assert }) => {
    const user = await UserFactory.create()
    const group = await GroupFactory.merge({ master: user.id }).create()

    const responseRequests = await client.post(`/groups/${group.id}/requests`).json({}).loginAs(user)

    const response = await client.post(`/groups/${group.id}/requests/${responseRequests.body().groupRequest.id}/accept`).loginAs(user)

    response.assertStatus(200)

    assert.exists(response.body().groupRequest, 'Group Undefined')
    assert.equal(response.body().groupRequest.userId, user.id)
    assert.equal(response.body().groupRequest.groupId, group.id)
    assert.equal(response.body().groupRequest.status, 'ACCEPTED')

    await group.load('players')

    assert.exists(group.players, 'Players Undefined')
    assert.equal(group.players.length, 1)
    assert.equal(group.players[0].id, user.id)
  })

  test('Deve retornar 404 quando for informado um grupo inexistente', async ({ client, assert }) => {
    const user = await UserFactory.create()
    const master = await UserFactory.create()
    const group = await GroupFactory.merge({ master: master.id }).create()

    const responseRequests = await client.post(`/groups/${group.id}/requests`).json({}).loginAs(user)

    const response = await client.post(`/groups/123/requests/${responseRequests.body().groupRequest.id}/accept`).loginAs(user)

    response.assertStatus(404)

    assert.equal(response.body().code, 'BAD_REQUEST')
    assert.equal(response.body().status, 404)
  })

  test('Deve retornar 404 quando for informado uma requisição inexistente', async ({ client, assert }) => {
    const user = await UserFactory.create()
    const master = await UserFactory.create()
    const group = await GroupFactory.merge({ master: master.id }).create()

    await client.post(`/groups/${group.id}/requests`).json({}).loginAs(user)

    const response = await client.post(`/groups/${group.id}/requests/123/accept`).loginAs(user)

    response.assertStatus(404)

    assert.equal(response.body().code, 'BAD_REQUEST')
    assert.equal(response.body().status, 404)
  })

  test('Deve rejeitar uma requisição', async ({ client, assert }) => {
    const user = await UserFactory.create()
    const group = await GroupFactory.merge({ master: user.id }).create()

    const responseRequests = await client.post(`/groups/${group.id}/requests`).json({}).loginAs(user)

    const response = await client.delete(`/groups/${group.id}/requests/${responseRequests.body().groupRequest.id}`).loginAs(user)

    response.assertStatus(200)

    const groupRequest = await GroupRequest.find(responseRequests.body().groupRequest.id)
    assert.isNull(groupRequest)
  })

  test('Deve retornar 404 quando não existe o grupo da requisição', async ({ client, assert }) => {
    const user = await UserFactory.create()
    const master = await UserFactory.create()
    const group = await GroupFactory.merge({ master: master.id }).create()

    const responseGroup = await client.post(`/groups/${group.id}/requests`).json({}).loginAs(user)

    const response = await client.delete(`/groups/123/requests/${responseGroup.body().groupRequest.id}`).loginAs(user)

    response.assertStatus(404)

    assert.equal(response.body().code, 'BAD_REQUEST')
    assert.equal(response.body().status, 404)
  })

  test('Deve retornar 404 quando não existe a requisição no grupo', async ({ client, assert }) => {
    const user = await UserFactory.create()
    const master = await UserFactory.create()
    const group = await GroupFactory.merge({ master: master.id }).create()

    await client.post(`/groups/${group.id}/requests`).json({}).loginAs(user)

    const response = await client.delete(`/groups/${group.id}/requests/123`).loginAs(user)

    response.assertStatus(404)

    assert.equal(response.body().code, 'BAD_REQUEST')
    assert.equal(response.body().status, 404)
  })
})
