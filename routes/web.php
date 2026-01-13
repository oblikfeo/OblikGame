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

// Маршруты для игры Шпион
Route::get('/room/{roomCode}/spy/rules', [SpyController::class, 'showRules'])->name('spy.rules');
Route::post('/room/{roomCode}/spy/start', [SpyController::class, 'startGame']);
Route::get('/room/{roomCode}/spy/game', [SpyController::class, 'showGame'])->name('spy.game');
Route::post('/room/{roomCode}/spy/ready-to-vote', [SpyController::class, 'readyToVote']);
Route::post('/room/{roomCode}/spy/start-voting', [SpyController::class, 'startVoting']);
Route::get('/room/{roomCode}/spy/voting', [SpyController::class, 'showVoting'])->name('spy.voting');
Route::post('/room/{roomCode}/spy/vote', [SpyController::class, 'submitVote']);
Route::get('/room/{roomCode}/spy/results', [SpyController::class, 'showResults'])->name('spy.results');
