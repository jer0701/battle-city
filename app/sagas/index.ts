import { takeEvery, delay, eventChannel } from 'redux-saga'
import { fork, take, put } from 'redux-saga/effects'
import userController from 'sagas/userController'
import bulletsSaga from 'sagas/bulletsSaga'
import gameManager from 'sagas/gameManager'
import workerSaga from 'sagas/workerSaga'
import { CONTROL_CONFIG, TANK_SPAWN_DELAY } from 'utils/constants'
import { Action, SpawnExplosionAction, SpawnFlickerAction } from 'types'

const tickChannel = eventChannel<Action>((emit) => {
  let lastTime = performance.now()
  let requestId = requestAnimationFrame(emitTick)

  function emitTick() {
    const now = performance.now()
    emit({ type: 'TICK', delta: now - lastTime })
    emit({ type: 'AFTER_TICK', delta: now - lastTime })
    lastTime = now
    requestId = requestAnimationFrame(emitTick)
  }

  return () => {
    cancelAnimationFrame(requestId)
  }
})

function* autoRemoveEffects() {
  yield takeEvery('SPAWN_EXPLOSION', function* removeExplosion({ explosionId, explosionType }: SpawnExplosionAction) {
    if (explosionType === 'bullet') {
      yield delay(200)
    } else if (explosionType === 'tank') {
      yield delay(500)
    }
    yield put({ type: 'REMOVE_EXPLOSION', explosionId })
  })
  yield takeEvery('SPAWN_FLICKER', function* removeFlicker({ flickerId }: SpawnFlickerAction) {
    yield delay(TANK_SPAWN_DELAY)
    yield put({ type: 'REMOVE_FLICKER', flickerId })
  })
}

export default function* rootSaga() {
  console.debug('root saga started')
  yield fork(function* handleTick() {
    while (true) {
      yield put(yield take(tickChannel))
    }
  })

  // 注意各个saga的启动顺序, 这将影响到后续action的put顺序
  yield fork(bulletsSaga)
  yield fork(autoRemoveEffects)

  // 生成两个键盘的控制器, 对应现实生活的游戏控制器
  yield fork(userController, 'player-1', CONTROL_CONFIG.player1)
  yield fork(userController, 'player-2', CONTROL_CONFIG.player2)

  yield fork(workerSaga)

  yield fork(gameManager)
}