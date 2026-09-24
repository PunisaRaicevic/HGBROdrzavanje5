import { test } from 'node:test';
import assert from 'node:assert/strict';
import { roomAccess } from './roomAccess';

const user = { role: 'recepcioner', is_active: true, full_name: 'Test', job_title: null as string | null };
test('housekeepers, supervisors, managers and operators can manage both hotels', () => {
  for (const job_title of ['Domaćica', 'Nadzornica', 'Menadžer']) {
    assert.equal(roomAccess({ ...user, job_title }).allowedHotels.length, 2);
  }
  for (const role of ['sef', 'operater', 'menadzer']) {
    assert.equal(roomAccess({ ...user, role }).allowedHotels.length, 2);
  }
});
test('cooks and excluded roles cannot access rooms', () => {
  assert.equal(roomAccess({ ...user, room_access_enabled: false }).canManage, false);
  assert.equal(roomAccess({ ...user, room_access_enabled: true }).canManage, true);
  for (const job_title of ['Kuvar', 'Glavni kuvar', 'Pomoćni kuhar', 'Kuvarica', 'Chef', 'Majstor']) {
    assert.equal(roomAccess({ ...user, job_title }).canManage, false);
  }
  for (const role of ['radnik', 'serviser', 'treca_lica', 'unknown']) {
    assert.equal(roomAccess({ ...user, role }).canManage, false);
  }
  assert.equal(roomAccess({ ...user, is_active: false }).canManage, false);
  assert.equal(roomAccess(null).canManage, false);
});
test('reception remains scoped to its own hotel, unknown reception fails closed', () => {
  for (const [full_name, hotel] of [
    ['Recepcija Slovenska', 'Hotel Slovenska plaža'],
    ['Recepcija Slovenska plaža 4', 'Hotel Slovenska plaža'],
    ['Recepcija Hotel Aleksandar', 'Hotel Aleksandar'],
  ]) {
    assert.deepEqual(roomAccess({ ...user, full_name }).allowedHotels, [hotel]);
  }
  assert.equal(roomAccess({ ...user, full_name: 'Recepcija nepoznata' }).canManage, false);
  assert.equal(roomAccess({ ...user, job_title: 'Recepcioner' }).canManage, false);
  assert.equal(roomAccess({ ...user, role: 'admin' }).allowedHotels.length, 6);
});