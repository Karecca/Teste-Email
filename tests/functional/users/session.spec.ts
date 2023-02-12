import Database from '@ioc:Adonis/Lucid/Database';
import { test } from '@japa/runner';
import { UserFactory } from 'Database/factories';

test.group('Session', (group) => {

  group.each.setup(async () => {
    await Database.beginGlobalTransaction()
    return () => Database.rollbackGlobalTransaction()
  })

  test('Deve autenticar um usuario', async ({ client, assert }) => {
    const plainPassword = 'test'
    const { id, email, username } = await UserFactory.merge({ password: plainPassword }).create()
    const response = await client.post('/sessions').json({ email, password: plainPassword, username })

    response.assertStatus(201)
    assert.isDefined(response.body().user, 'User Undefined')
    assert.equal(response.body().user.id, id)
  })

  test('Deve retornar um token quando a sessão é criada', async ({ client, assert }) => {
    const plainPassword = 'test'
    const { id, email, username } = await UserFactory.merge({ password: plainPassword }).create()
    const response = await client.post('/sessions').json({ email, password: plainPassword, username })

    response.assertStatus(201)
    assert.isDefined(response.body().token, 'Token Undefined')
    assert.equal(response.body().user.id, id)
  })

  test('Deve retornar 400 quando as credenciais não são fornecidas', async ({ client, assert }) => {
    const response = await client.post('/sessions').json({})

    response.assertStatus(400)
    assert.equal(response.body().code, 'BAD_REQUEST')
    assert.equal(response.body().status, 400)
  })

  test('Deve retornar 400 quando as credenciais são invalidas', async ({ client, assert }) => {
    const { email } = await UserFactory.create()
    const response = await client.post('/sessions').json({
      email, password: 'test'
    })

    response.assertStatus(400)
    assert.equal(response.body().code, 'BAD_REQUEST')
    assert.equal(response.body().status, 400)
    assert.equal(response.body().message, 'invalid credentials')
  })

  test('Deve retornar 200 quando o usuario faz logout', async ({ client, assert }) => {
    const plainPassword = 'test'
    const user = await UserFactory.merge({ password: plainPassword }).create()
    const { email } = user
    const response = await client.post('/sessions').json({ email, password: plainPassword }).loginAs(user)

    response.assertStatus(201)

    const apiToken = response.body().token

    const deleteResponse = await client.delete('/sessions').header('Authorization', `Bearer ${apiToken.token}`)

    deleteResponse.assertStatus(200)

  })

  test('Deve testar se o token é revogado quando o usuario faz logout', async ({ client, assert }) => {
    const plainPassword = 'test'
    const { email } = await UserFactory.merge({ password: plainPassword }).create()
    const response = await client.post('/sessions').json({ email, password: plainPassword })

    response.assertStatus(201)

    const apiToken = response.body().token

    const deleteResponse = await client.delete('/sessions').header('Authorization', `Bearer ${apiToken.token}`)

    deleteResponse.assertStatus(200)

    const token = await Database.query()
      .select('*')
      .from('api_tokens')
    //.where('token', apiToken.token)
    assert.isEmpty(token)

  })
})
