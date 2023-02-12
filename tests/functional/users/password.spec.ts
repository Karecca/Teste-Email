import Mail from '@ioc:Adonis/Addons/Mail';
import Hash from '@ioc:Adonis/Core/Hash';
import Database from '@ioc:Adonis/Lucid/Database';
import { test } from '@japa/runner';
import { DateTime, Duration } from 'luxon';

import { UserFactory } from '../../../Database/factories';

test.group('Passwords', (group) => {

  group.each.setup(async () => {
    await Database.beginGlobalTransaction()
    return () => Database.rollbackGlobalTransaction()
  })

  test('Deve enviar um email com instruções para esqueci senha', async ({ client, assert }) => {
    const user = await UserFactory.create()

    const fakeMailer = Mail.fake()

    const response = await client.post('/forgot-password').json({
      email: user.email,
      resetPasswordUrl: 'url'
    })

    response.assertStatus(204)

    const message = fakeMailer.find((mail) => {
      return mail.from?.address == 'contato@quinzeautomacao.com.br'
    })

    assert.include(message?.html, user.username)
    assert.equal(message?.subject, 'CRM Quinze: Recuperação de Senha')

    Mail.restore()

    response.assertStatus(204)
  })

  test('Deve criar um token de reset de senha', async ({ client, assert }) => {
    const user = await UserFactory.create()

    Mail.fake()

    const response = await client.post('/forgot-password').json({
      email: user.email,
      resetPasswordUrl: 'url'
    })

    response.assertStatus(204)

    const tokens = await user.related('tokens').query()
    assert.isNotEmpty(tokens)

    Mail.restore()
  })

  test('Deve retornar 422 quando faltar dados ou ter dados inválidos na alteração de senha', async ({ client, assert }) => {
    const response = await client.post('/forgot-password').json({})

    response.assertStatus(422)

    assert.equal(response.body().code, 'BAD_REQUEST')
    assert.equal(response.body().status, 422)
  })

  test('Deve conseguir redefinir a senha', async ({ client, assert }) => {
    const user = await UserFactory.create()
    const { token } = await user.related('tokens').create({ token: 'token' })

    const response = await client.post('/reset-password').json({ token, password: '123456' })

    await user.refresh()
    const checkPassword = await Hash.verify(user.password, '123456')
    assert.isTrue(checkPassword)

    response.assertStatus(204)
  })

  test('Deve retornar 422 quando faltar dados ou ter dados inválidos na alteração de senha', async ({ client, assert }) => {
    const response = await client.post('/reset-password').json({})

    response.assertStatus(422)

    assert.equal(response.body().code, 'BAD_REQUEST')
    assert.equal(response.body().status, 422)
  })

  test('Deve retornar 404 ao usar o mesmo token duas vezes', async ({ client, assert }) => {
    const user = await UserFactory.create()
    const { token } = await user.related('tokens').create({ token: 'token' })

    const response = await client.post('/reset-password').json({ token, password: '123456' })
    response.assertStatus(204)

    const duoresponse = await client.post('/reset-password').json({ token, password: '123456' })
    duoresponse.assertStatus(404)

    assert.equal(duoresponse.body().code, 'BAD_REQUEST')
    assert.equal(duoresponse.body().status, 404)
  })

  test('Testar se é possível redefinir a senha quando o token expira após 2 horas', async ({ client, assert }) => {
    const user = await UserFactory.create()
    const date = DateTime.now().minus(Duration.fromISOTime('02:01'))
    const { token } = await user.related('tokens').create({ token: 'token', createdAt: date })

    const response = await client.post('/reset-password').json({ token, password: '123456' })
    response.assertStatus(410)
    //assert.equal(response.body().code, 'TOKEN_EXPIRED')
    assert.equal(response.body().status, 410)
    assert.equal(response.body().message, 'token has expired')
  })
})
