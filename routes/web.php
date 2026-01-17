<?php

use Illuminate\Support\Facades\Route;
use Inertia\Inertia;
use App\Http\Controllers\RoomController;
use App\Http\Controllers\SpyController;

Route::get('/', function () {
    return Inertia::render('Lobby');
});

Route::post('/room/create', [RoomController::class, 'create']);
Route::post('/room/join', [RoomController::class, 'join']);
Route::get('/room/{roomCode}', [RoomController::class, 'show'])->name('room.show');
Route::get('/api/room/{roomCode}/players', [RoomController::class, 'getPlayers']);
Route::post('/room/leave', [RoomController::class, 'leave']);
Route::post('/room/start', [RoomController::class, 'start']);
Route::get('/room/{roomCode}/games', [RoomController::class, 'showGameSelection'])->name('room.games');
Route::post('/room/{roomCode}/games/select', [RoomController::class, 'selectGame']);

// Маршруты для игры Шпион
Route::get('/room/{roomCode}/spy/rules', [SpyController::class, 'showRules'])->name('spy.rules');
Route::post('/room/{roomCode}/spy/ready-to-start', [SpyController::class, 'readyToStart']);
Route::post('/room/{roomCode}/spy/start', [SpyController::class, 'startGame']);
Route::get('/room/{roomCode}/spy/game', [SpyController::class, 'showGame'])->name('spy.game');
Route::get('/room/{roomCode}/spy/game-data', [SpyController::class, 'getGameData']);
Route::post('/room/{roomCode}/spy/ready-to-vote', [SpyController::class, 'readyToVote']);
Route::post('/room/{roomCode}/spy/start-voting', [SpyController::class, 'startVoting']);
Route::get('/room/{roomCode}/spy/voting', [SpyController::class, 'showVoting'])->name('spy.voting');
Route::post('/room/{roomCode}/spy/vote', [SpyController::class, 'submitVote']);
Route::get('/room/{roomCode}/spy/results', [SpyController::class, 'showResults'])->name('spy.results');
Route::get('/room/{roomCode}/spy/spy-guess', [SpyController::class, 'showSpyGuess'])->name('spy.guess');
Route::get('/room/{roomCode}/spy/guess-options', [SpyController::class, 'getGuessOptions']);
Route::get('/room/{roomCode}/spy/guess-status', [SpyController::class, 'getGuessStatus']);
Route::post('/room/{roomCode}/spy/submit-guess', [SpyController::class, 'submitGuess']);
Route::post('/room/{roomCode}/spy/vote-guess', [SpyController::class, 'voteGuess']);
