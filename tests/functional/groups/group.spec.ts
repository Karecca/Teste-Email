import Database from '@ioc:Adonis/Lucid/Database';
import { test } from '@japa/runner';
import Group from 'App/Models/Group';
import { GroupFactory, UserFactory } from 'Database/factories';

test.group('group', (group) => {
  group.each.setup(async () => {
    await Database.beginGlobalTransaction()

    return () => Database.rollbackGlobalTransaction()
  })

  test('Deve criar uma mesa', async ({ client, assert }) => {
    const user = await UserFactory.create()
    const groupPayload = {
      name: 'test',
      description: 'test',
      schedule: 'test',
      location: 'test',
      chronic: 'test',
      master: user.id
    }

    const response = await client.post('/groups').json(groupPayload).loginAs(user)

    response.assertStatus(201)
    assert.exists(response.body().group, 'Group Undefined')
    assert.equal(response.body().group.name, groupPayload.name)
    assert.equal(response.body().group.description, groupPayload.description)
    assert.equal(response.body().group.schedule, groupPayload.schedule)
    assert.equal(response.body().group.location, groupPayload.location)
    assert.equal(response.body().group.chronic, groupPayload.chronic)
    assert.equal(response.body().group.master, groupPayload.master)
    assert.exists(response.body().group.players, 'Players Undefined')
    assert.equal(response.body().group.players.length, 1)
    assert.equal(response.body().group.players[0].id, groupPayload.master)
  })

  test('Deve retornar 422 quando falta dados para criação de mesa', async ({ client, assert }) => {
    const user = await UserFactory.create()
    const response = await client.post('/groups').json({}).loginAs(user)

    response.assertStatus(422)
    assert.equal(response.body().code, 'BAD_REQUEST')
    assert.equal(response.body().status, 422)
  })

  test('Deve atualizar um grupo', async ({ client, assert }) => {
    const master = await UserFactory.create()
    const group = await GroupFactory.merge({ master: master.id }).create()
    const payload = {
      name: 'test',
      description: 'test',
      schedule: 'test',
      location: 'test',
      chronic: 'test'
    }
    console.log(group.id);

    const response = await client.patch(`/groups/${group.id}`).json(payload).loginAs(master)

    response.assertStatus(200)

    assert.exists(response.body().group, 'Group Undefined')
    assert.equal(response.body().group.name, payload.name)
    assert.equal(response.body().group.description, payload.description)
    assert.equal(response.body().group.schedule, payload.schedule)
    assert.equal(response.body().group.location, payload.location)
    assert.equal(response.body().group.chronic, payload.chronic)
  })

  test('Deve retornar 404 quando informar um grupo inexistente para alteração', async ({ client, assert }) => {
    const user = await UserFactory.create()
    const response = await client.patch('/groups/1').json({}).loginAs(user)

    response.assertStatus(404)

    assert.equal(response.body().code, 'BAD_REQUEST')
    assert.equal(response.body().status, 404)
  })

  test('Deve remover um usuario do grupo', async ({ client, assert }) => {
    const user = await UserFactory.create()
    const master = await UserFactory.create()
    const group = await GroupFactory.merge({ master: master.id }).create()

    const responseGroup = await client.post(`/groups/${group.id}/requests`).json({}).loginAs(user)

    await client.post(`/groups/${group.id}/requests/${responseGroup.body().groupRequest.id}/accept`).loginAs(master)

    const response = await client.delete(`/groups/${group.id}/players/${user.id}`).loginAs(master)

    response.assertStatus(200)

    await group.load('players')
    assert.isEmpty(group.players)

  })

  test('Não deve remover o mestre do grupo', async ({ client, assert }) => {
    const master = await UserFactory.create()
    const groupPayload = {
      name: 'test',
      description: 'test',
      schedule: 'test',
      location: 'test',
      chronic: 'test',
      master: master.id
    }

    const responseGroup = await client.post('/groups').json(groupPayload).loginAs(master)
    const response = await client.delete(`/groups/${responseGroup.body().group.id}/players/${master.id}`).loginAs(master)

    response.assertStatus(400)

    const groupModel = await Group.findOrFail(responseGroup.body().group.id)

    await groupModel.load('players')

    assert.isNotEmpty(groupModel.players)
  })

  test('Deve remover o grupo', async ({ client, assert }) => {
    const master = await UserFactory.create()
    const groupPayload = {
      name: 'test',
      description: 'test',
      schedule: 'test',
      location: 'test',
      chronic: 'test',
      master: master.id
    }
    const responseGroup = await client.post('/groups').json(groupPayload).loginAs(master)
    const group = responseGroup.body().group

    const response = await client.delete(`/groups/${group.id}`).json({}).loginAs(master)

    response.assertStatus(200)

    const emptyGroup = await Database.query().from('groups').where('id', group.id)
    assert.isEmpty(emptyGroup)

    const players = await Database.query().from('groups_users')
    assert.isEmpty(players)
  })

  test('Deve retornar 404 quando informado um grupo que não existe', async ({ client, assert }) => {
    const master = await UserFactory.create()
    const response = await client.delete('/groups/1').json({}).loginAs(master)

    response.assertStatus(404)

    assert.equal(response.body().code, 'BAD_REQUEST')
    assert.equal(response.body().status, 404)
  })

  test('Deve retornar todos os grupos quando não é informado uma query', async ({ client, assert }) => {
    const master = await UserFactory.create()
    const groupPayload = {
      name: 'test',
      description: 'test',
      schedule: 'test',
      location: 'test',
      chronic: 'test',
      master: master.id
    }
    const responseGroup = await client.post('/groups').json(groupPayload).loginAs(master)
    const group = responseGroup.body().group

    const response = await client.get('/groups').loginAs(master)
    response.assertStatus(200)

    assert.exists(response.body().groups, 'Group Undefined')
    assert.equal(response.body().groups.data.length, 1)
    assert.equal(response.body().groups.data[0].id, group.id)
    assert.equal(response.body().groups.data[0].name, group.name)
    assert.equal(response.body().groups.data[0].description, group.description)
    assert.equal(response.body().groups.data[0].location, group.location)
    assert.equal(response.body().groups.data[0].schedule, group.schedule)
    assert.exists(response.body().groups.data[0].masterUser, 'Master Undefined')
    assert.equal(response.body().groups.data[0].masterUser.id, master.id)
    assert.equal(response.body().groups.data[0].masterUser.username, master.username)
    assert.isNotEmpty(response.body().groups.data[0].players, 'Empty Players')
    assert.equal(response.body().groups.data[0].players[0].id, master.id)
    assert.equal(response.body().groups.data[0].players[0].email, master.email)
    assert.equal(response.body().groups.data[0].players[0].username, master.username)
  })

  test('Não deve retornar grupo com usuario inexistente', async ({ client, assert }) => {
    const master = await UserFactory.create()
    const groupPayload = {
      name: 'test',
      description: 'test',
      schedule: 'test',
      location: 'test',
      chronic: 'test',
      master: master.id
    }
    const responseGroup = await client.post('/groups').json(groupPayload).loginAs(master)
    responseGroup.assertStatus(201)
    const group = responseGroup.body().group

    const response = await client.get('/groups?user=123').loginAs(master)
    response.assertStatus(200)

    assert.exists(response.body().groups, 'Groups Undefined')
    assert.equal(response.body().groups.data.length, 0)
  })

  test('Deve retornar os grupos em que o usuario está inscrito', async ({ client, assert }) => {
    const master = await UserFactory.create()
    const groupPayload = {
      name: 'test',
      description: 'test',
      schedule: 'test',
      location: 'test',
      chronic: 'test',
      master: master.id
    }
    const responseGroup = await client.post('/groups').json(groupPayload).loginAs(master)
    const group = responseGroup.body().group

    const response = await client.get(`/groups?user=${master.id}`).loginAs(master)
    response.assertStatus(200)

    assert.exists(response.body().groups, 'Group Undefined')
    assert.equal(response.body().groups.data.length, 1)
    assert.equal(response.body().groups.data[0].id, group.id)
    assert.equal(response.body().groups.data[0].name, group.name)
    assert.equal(response.body().groups.data[0].description, group.description)
    assert.equal(response.body().groups.data[0].location, group.location)
    assert.equal(response.body().groups.data[0].schedule, group.schedule)
    assert.exists(response.body().groups.data[0].masterUser, 'Master Undefined')
    assert.equal(response.body().groups.data[0].masterUser.id, master.id)
    assert.equal(response.body().groups.data[0].masterUser.username, master.username)
    assert.isNotEmpty(response.body().groups.data[0].players, 'Empty Players')
    assert.equal(response.body().groups.data[0].players[0].id, master.id)
    assert.equal(response.body().groups.data[0].players[0].email, master.email)
    assert.equal(response.body().groups.data[0].players[0].username, master.username)
  })

  test('Deve retornar os grupos com busca por usuario e nome do grupo', async ({ client, assert }) => {
    const master = await UserFactory.create()
    const groupPayload = {
      name: 'test',
      description: 'test',
      schedule: 'test',
      location: 'test',
      chronic: 'test',
      master: master.id
    }
    const responseGroup = await client.post('/groups').json(groupPayload).loginAs(master)
    responseGroup.assertStatus(201)
    const group = responseGroup.body().group
    const responseGroup2 = await client.post('/groups').json({ ...groupPayload, name: '123', description: '123' }).loginAs(master)
    responseGroup2.assertStatus(201)

    const response = await client.get(`/groups?user=${master.id}&text=es`).loginAs(master)
    response.assertStatus(200)

    assert.exists(response.body().groups, 'Group Undefined')
    assert.equal(response.body().groups.data.length, 1)
    assert.equal(response.body().groups.data[0].id, group.id)
    assert.equal(response.body().groups.data[0].name, group.name)
    assert.equal(response.body().groups.data[0].description, group.description)
    assert.equal(response.body().groups.data[0].location, group.location)
    assert.equal(response.body().groups.data[0].schedule, group.schedule)
    assert.exists(response.body().groups.data[0].masterUser, 'Master Undefined')
    assert.equal(response.body().groups.data[0].masterUser.id, master.id)
    assert.equal(response.body().groups.data[0].masterUser.username, master.username)
    assert.isNotEmpty(response.body().groups.data[0].players, 'Empty Players')
    assert.equal(response.body().groups.data[0].players[0].id, master.id)
    assert.equal(response.body().groups.data[0].players[0].email, master.email)
    assert.equal(response.body().groups.data[0].players[0].username, master.username)
  })

  test('Deve retornar os grupos com busca por usuario e nome do grupo ou descrição', async ({ client, assert }) => {
    const master = await UserFactory.create()
    const groupPayload = {
      name: 'outro nome',
      description: 'test',
      schedule: 'test',
      location: 'test',
      chronic: 'test',
      master: master.id
    }
    const responseGroup = await client.post('/groups').json(groupPayload).loginAs(master)
    responseGroup.assertStatus(201)
    const group = responseGroup.body().group
    const responseGroup2 = await client.post('/groups').json({ ...groupPayload, name: '123', description: '123' }).loginAs(master)
    responseGroup2.assertStatus(201)

    const response = await client.get(`/groups?user=${master.id}&text=es`).loginAs(master)
    response.assertStatus(200)

    assert.exists(response.body().groups, 'Group Undefined')
    assert.equal(response.body().groups.data.length, 1)
    assert.equal(response.body().groups.data[0].id, group.id)
    assert.equal(response.body().groups.data[0].name, group.name)
    assert.equal(response.body().groups.data[0].description, group.description)
    assert.equal(response.body().groups.data[0].location, group.location)
    assert.equal(response.body().groups.data[0].schedule, group.schedule)
    assert.exists(response.body().groups.data[0].masterUser, 'Master Undefined')
    assert.equal(response.body().groups.data[0].masterUser.id, master.id)
    assert.equal(response.body().groups.data[0].masterUser.username, master.username)
    assert.isNotEmpty(response.body().groups.data[0].players, 'Empty Players')
    assert.equal(response.body().groups.data[0].players[0].id, master.id)
    assert.equal(response.body().groups.data[0].players[0].email, master.email)
    assert.equal(response.body().groups.data[0].players[0].username, master.username)
  })

  test('Deve retornar os grupos com busca por nome do grupo', async ({ client, assert }) => {
    const master = await UserFactory.create()
    const groupPayload = {
      name: 'outro nome',
      description: 'test',
      schedule: 'test',
      location: 'test',
      chronic: 'test',
      master: master.id
    }
    const responseGroup = await client.post('/groups').json(groupPayload).loginAs(master)
    responseGroup.assertStatus(201)
    const group = responseGroup.body().group
    const responseGroup2 = await client.post('/groups').json({ ...groupPayload, name: '123', description: '123' }).loginAs(master)
    responseGroup2.assertStatus(201)

    const response = await client.get(`/groups?text=nome`).loginAs(master)
    response.assertStatus(200)

    assert.exists(response.body().groups, 'Group Undefined')
    assert.equal(response.body().groups.data.length, 1)
    assert.equal(response.body().groups.data[0].id, group.id)
    assert.equal(response.body().groups.data[0].name, group.name)
    assert.equal(response.body().groups.data[0].description, group.description)
    assert.equal(response.body().groups.data[0].location, group.location)
    assert.equal(response.body().groups.data[0].schedule, group.schedule)
    assert.exists(response.body().groups.data[0].masterUser, 'Master Undefined')
    assert.equal(response.body().groups.data[0].masterUser.id, master.id)
    assert.equal(response.body().groups.data[0].masterUser.username, master.username)
    assert.isNotEmpty(response.body().groups.data[0].players, 'Empty Players')
    assert.equal(response.body().groups.data[0].players[0].id, master.id)
    assert.equal(response.body().groups.data[0].players[0].email, master.email)
    assert.equal(response.body().groups.data[0].players[0].username, master.username)
  })
})
