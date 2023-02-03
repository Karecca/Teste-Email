import Database from '@ioc:Adonis/Lucid/Database';
import { test } from '@japa/runner';
import { UserFactory } from 'Database/factories';

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

  test('deve retornar 422 quando os dados necessários não são fornecidos', async ({ client }) => {
    const response = await client.post('/users').json({})

    response.assertStatus(422)
    response.assertBodyContains({
      'code': 'BAD_REQUEST'
    })
  })

  test('deve retornar 422 quando é fornecido um email invalido', async ({ client }) => {
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

  test('deve retornar 422 quando é fornecido uma senha invalida', async ({ client }) => {
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

})
