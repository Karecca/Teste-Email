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
})
