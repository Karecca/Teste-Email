import Mail from '@ioc:Adonis/Addons/Mail';
import Database from '@ioc:Adonis/Lucid/Database';
import { test } from '@japa/runner';

import { UserFactory } from '../../../Database/factories';

test.group('Users passwords', (group) => {

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

    const response = await client.post('/forgot-password').json({
      email: user.email,
      resetPasswordUrl: 'url'
    })

    response.assertStatus(204)

    const tokens = await user.related('tokens').query()
    assert.isNotEmpty(tokens)
  })
})
