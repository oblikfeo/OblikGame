<?php

use Illuminate\Support\Facades\Broadcast;

Broadcast::channel('App.Models.User.{id}', function ($user, $id) {
    return (int) $user->id === (int) $id;
});

// Публичный канал для комнат (любой может подключиться)
Broadcast::channel('room.{roomCode}', function ($user, $roomCode) {
    return true;
});
