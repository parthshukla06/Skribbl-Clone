import assert from 'node:assert/strict';
import { afterEach, test } from 'node:test';
import { Server } from 'socket.io';
import { roomManager } from '../src/services/RoomManager';

interface EmittedEvent {
  target: string;
  event: string;
  payload: any;
}

interface TestRoom {
  roomCode: string;
  playerIds: string[];
  events: EmittedEvent[];
}

const activeRooms: TestRoom[] = [];

function createTestRoom(playerCount = 2): TestRoom {
  const events: EmittedEvent[] = [];
  const sockets = new Map<string, { to: (target: string) => { emit: (event: string, payload: any) => void } }>();
  const io = {
    to: (target: string) => ({
      emit: (event: string, payload: any) => events.push({ target, event, payload }),
    }),
    sockets: { sockets },
  } as unknown as Server;
  roomManager.setIO(io);

  const playerIds = Array.from({ length: playerCount }, (_, index) => `test-${Date.now()}-${Math.random()}-${index}`);
  playerIds.forEach((id) => sockets.set(id, {
    to: (target) => ({
      emit: (event, payload) => events.push({ target, event, payload }),
    }),
  }));
  const { room } = roomManager.createRoom(playerIds[0], 'Player 1');
  playerIds.slice(1).forEach((id, index) => roomManager.joinRoom(room.code, id, `Player ${index + 2}`));
  room.settings.drawTime = 60;
  room.settings.rounds = 3;
  roomManager.startGame(playerIds[0], room.code);
  const testRoom = { roomCode: room.code, playerIds, events };
  activeRooms.push(testRoom);
  return testRoom;
}

function chooseAvailableWord(testRoom: TestRoom): string {
  const wordChoices = testRoom.events.find(
    (event) => event.event === 'word_choices' && event.target === testRoom.playerIds[0],
  )?.payload.words;
  assert.ok(wordChoices?.length, 'word choices should be sent to the active drawer');
  roomManager.chooseWord(testRoom.playerIds[0], wordChoices[0], testRoom.roomCode);
  return wordChoices[0];
}

afterEach(() => {
  for (const activeRoom of activeRooms.splice(0)) {
    activeRoom.playerIds.forEach((playerId) => roomManager.leaveRoom(playerId, activeRoom.roomCode));
  }
});

test('awards time-based points to the correct guesser and active drawer', () => {
  const activeRoom = createTestRoom();
  const secretWord = chooseAvailableWord(activeRoom);
  const room = roomManager.getRoom(activeRoom.roomCode)!;
  room.game!.timeLeft = 30;

  roomManager.submitGuess(activeRoom.playerIds[1], secretWord, activeRoom.roomCode);

  assert.equal(room.players[1].score, 500);
  assert.equal(room.players[0].score, 250);
});

test('prevents a second score award for a player in the same turn', () => {
  const activeRoom = createTestRoom();
  const secretWord = chooseAvailableWord(activeRoom);
  const room = roomManager.getRoom(activeRoom.roomCode)!;
  room.game!.timeLeft = 45;

  roomManager.submitGuess(activeRoom.playerIds[1], secretWord, activeRoom.roomCode);
  roomManager.submitGuess(activeRoom.playerIds[1], secretWord, activeRoom.roomCode);

  assert.equal(room.players[1].score, 750);
  assert.equal(room.players[0].score, 375);
  assert.deepEqual(room.game!.guessedPlayerIds, [activeRoom.playerIds[1]]);
});

test('does not award points for incorrect guesses', () => {
  const activeRoom = createTestRoom();
  chooseAvailableWord(activeRoom);
  const room = roomManager.getRoom(activeRoom.roomCode)!;

  roomManager.submitGuess(activeRoom.playerIds[1], 'definitely-not-the-word', activeRoom.roomCode);

  assert.deepEqual(room.players.map((player) => player.score), [0, 0]);
  assert.deepEqual(room.game!.guessedPlayerIds, []);
});

test('does not allow the active drawer to score by guessing their own word', () => {
  const activeRoom = createTestRoom();
  const secretWord = chooseAvailableWord(activeRoom);
  const room = roomManager.getRoom(activeRoom.roomCode)!;

  roomManager.submitGuess(activeRoom.playerIds[0], secretWord, activeRoom.roomCode);

  assert.deepEqual(room.players.map((player) => player.score), [0, 0]);
});

test('preserves scores between turns and resets only guessed-player tracking', () => {
  const activeRoom = createTestRoom(3);
  const firstWord = chooseAvailableWord(activeRoom);
  const room = roomManager.getRoom(activeRoom.roomCode)!;
  room.game!.timeLeft = 45;
  roomManager.submitGuess(activeRoom.playerIds[1], firstWord, activeRoom.roomCode);
  assert.equal(room.players[1].score, 750);

  roomManager.endTurn(activeRoom.roomCode, 'Test turn complete');
  roomManager.advanceToNextTurn(activeRoom.roomCode);
  assert.deepEqual(room.game!.guessedPlayerIds, []);
  const secondWord = chooseAvailableWordForCurrentDrawer(activeRoom);
  room.game!.timeLeft = 30;
  roomManager.submitGuess(activeRoom.playerIds[2], secondWord, activeRoom.roomCode);

  assert.equal(room.players[1].score, 1000);
  assert.equal(room.players[0].score, 375);
  assert.equal(room.players[2].score, 500);
});

test('publishes tied final rankings and resets scores when the host starts again', () => {
  const activeRoom = createTestRoom();
  const room = roomManager.getRoom(activeRoom.roomCode)!;
  room.settings.rounds = 1;
  room.game!.totalRounds = 1;
  room.game!.currentRound = 1;
  room.game!.currentDrawerIndex = room.players.length - 1;
  room.players[0].score = 300;
  room.players[1].score = 300;

  roomManager.advanceToNextTurn(activeRoom.roomCode);

  assert.equal(room.status, 'game_over');
  assert.deepEqual(room.finalResults?.map(({ rank, score }) => ({ rank, score })), [
    { rank: 1, score: 300 },
    { rank: 1, score: 300 },
  ]);
  assert.ok(activeRoom.events.some((event) => event.event === 'game_over'));

  roomManager.startGame(activeRoom.playerIds[0], activeRoom.roomCode);
  assert.equal(room.finalResults, undefined);
  assert.deepEqual(room.players.map((player) => player.score), [0, 0]);
  assert.equal(room.game?.currentRound, 1);
  assert.equal(room.game?.currentDrawerIndex, 0);
  assert.equal(room.game?.timeLeft, 15);
  assert.equal(room.drawHistory.length, 0);
  assert.equal(JSON.stringify(room.game).includes('secretWord'), false);
});

test('keeps results stable and avoids turn advancement when a player leaves after game over', () => {
  const activeRoom = createTestRoom();
  const room = roomManager.getRoom(activeRoom.roomCode)!;
  room.game!.totalRounds = 1;
  room.players[0].score = 400;
  room.players[1].score = 200;
  room.game!.currentDrawerIndex = room.players.length - 1;
  roomManager.advanceToNextTurn(activeRoom.roomCode);
  const resultsSnapshot = room.finalResults;

  const { room: updatedRoom, roomDeleted } = roomManager.leaveRoom(activeRoom.playerIds[1], activeRoom.roomCode);

  assert.equal(roomDeleted, false);
  assert.equal(updatedRoom?.status, 'game_over');
  assert.equal(updatedRoom?.finalResults, resultsSnapshot);
  assert.equal(updatedRoom?.players.length, 1);
  assert.equal(updatedRoom?.hostId, activeRoom.playerIds[0]);
});

test('keeps the secret word out of public room and guesser drawing state', () => {
  const activeRoom = createTestRoom();
  const secretWord = chooseAvailableWord(activeRoom);
  const room = roomManager.getRoom(activeRoom.roomCode)!;
  const publicRoomState = JSON.stringify(room);
  const guesserDrawingStart = activeRoom.events.find(
    (event) => event.event === 'drawing_start' && event.target === activeRoom.roomCode,
  )?.payload;

  assert.equal(publicRoomState.includes(secretWord), false);
  assert.equal(guesserDrawingStart?.secretWord, undefined);
});

test('does not reveal the selected word in turn-end events or room chat', () => {
  const activeRoom = createTestRoom();
  const secretWord = chooseAvailableWord(activeRoom);
  roomManager.endTurn(activeRoom.roomCode, 'Test turn complete');

  const publicEvents = activeRoom.events.filter((event) =>
    event.target === activeRoom.roomCode &&
    ['turn_end', 'chat_message', 'room_state'].includes(event.event),
  );

  assert.ok(publicEvents.length > 0);
  assert.equal(publicEvents.some((event) => JSON.stringify(event.payload).includes(secretWord)), false);
});

function chooseAvailableWordForCurrentDrawer(testRoom: TestRoom): string {
  const currentDrawerId = roomManager.getRoom(testRoom.roomCode)!.game!.currentDrawerId;
  const recentChoices = [...testRoom.events].reverse().find(
    (event) => event.event === 'word_choices' && event.target === currentDrawerId,
  )?.payload.words;
  assert.ok(recentChoices?.length, 'word choices should be sent to the next drawer');
  roomManager.chooseWord(currentDrawerId, recentChoices[0], testRoom.roomCode);
  return recentChoices[0];
}
