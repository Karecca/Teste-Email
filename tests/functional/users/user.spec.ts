import Hash from '@ioc:Adonis/Core/Hash';
import Database from '@ioc:Adonis/Lucid/Database';
import { test } from '@japa/runner';
import { UserFactory } from '../../../Database/factories';

test.group('Users', (group) => {

  group.each.setup(async () => {
    await Database.beginGlobalTransaction()
    return () => Database.rollbackGlobalTransaction()
  })

  test('Cadastro de Super Usuario', async ({ client, assert }) => {
    const userPayload = {
      username: 'Super Usuario',
      email: 'super@quinzeautomacao.com.br',
      password: '1234'
    }
    const response = await client.post('/users').json(userPayload)
    const { password, ...expected } = userPayload

    response.assertStatus(201)
    //response.assertBodyContains({ username: expected })
    assert.equal(response.body().id, undefined)
    assert.notExists(response.body().password, 'Password defined')
  })

  test('Cadastro de usuario com email já em uso', async ({ client }) => {
    const user = await UserFactory.create()
    const response = await client.post('/users').json({
      email: user.email,
      username: 'test',
      password: 'test'
    })
    response.assertStatus(409)
    response.assertBodyContains({
      'code': 'BAD_REQUEST'
    })
  })

  test('Cadastro de usuario com username já em uso', async ({ client }) => {
    const user = await UserFactory.create()
    const response = await client.post('/users').json({
      email: 'teste@test.com',
      username: user.username,
      password: 'test'
    })
    response.assertStatus(409)
    response.assertBodyContains({
      'code': 'BAD_REQUEST'
    })
  })

  test('Deve retornar 422 quando os dados necessários não são fornecidos', async ({ client }) => {
    const response = await client.post('/users').json({})

    response.assertStatus(422)
    response.assertBodyContains({
      'code': 'BAD_REQUEST'
    })
  })

  test('Deve retornar 422 quando é fornecido um email invalido', async ({ client }) => {
    const response = await client.post('/users').json({
      username: 'Teste',
      email: 'test@',
      password: 'test'
    })

    response.assertStatus(422)
    response.assertBodyContains({
      'code': 'BAD_REQUEST'
    })
  })

  test('Deve retornar 422 quando é fornecido uma senha invalida', async ({ client }) => {
    const response = await client.post('/users').json({
      username: 'Teste',
      email: 'test@gmail.com',
      password: 'tes'
    })

    response.assertStatus(422)
    response.assertBodyContains({
      'code': 'BAD_REQUEST'
    })
  })

  test('Deve testar a atualização do email de usuário', async ({ client }) => {
    const { id, username, password } = await UserFactory.create()
    const email = 'teste@test.com'

    const response = await client.put(`/users/${id}`).json({
      email: email,
      username: username,
      password: password
    })

    response.assertStatus(200)

    response.assertBodyContains({
      'user': {}
    })

  })

  test('Deve testar a atualização de senha do usuário', async ({ client, assert }) => {
    const user = await UserFactory.create()
    const password = 'test'

    const response = await client.put(`/users/${user.id}`).json({
      email: user.email,
      username: user.username,
      password: password
    })

    response.assertStatus(200)

    response.assertBodyContains({
      'user': {}
    })
    assert.exists(response.body().user, 'User Undefined')
    assert.equal(response.body().user.id, user.id)

    await user.refresh()
    assert.isTrue(await Hash.verify(user.password, password))
  })

  test('Deve retornar 422 quando falta dados para alteração de usuario', async ({ client, assert }) => {
    const { id } = await UserFactory.create()

    const response = await client.put(`/users/${id}`).json({})

    response.assertStatus(422)

    assert.equal(response.body().code, 'BAD_REQUEST')
    assert.equal(response.body().status, 422)
  })

  test('Deve retornar 422 quando fornecido email invalido para alteração', async ({ client, assert }) => {
    const { id, username, password } = await UserFactory.create()

    const response = await client.put(`/users/${id}`).json({
      username,
      email: 'test@',
      password
    })

    response.assertStatus(422)

    assert.equal(response.body().code, 'BAD_REQUEST')
    assert.equal(response.body().status, 422)
  })

  test('Deve retornar 422 quando fornecida senha invalida para alteração', async ({ client, assert }) => {
    const { id, username, email } = await UserFactory.create()

    const response = await client.put(`/users/${id}`).json({
      username,
      email,
      password: '12'
    })

    response.assertStatus(422)

    assert.equal(response.body().code, 'BAD_REQUEST')
    assert.equal(response.body().status, 422)
  })

})
