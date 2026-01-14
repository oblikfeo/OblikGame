<?php

namespace App\Events;

use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class SpyGuessVoteSubmitted implements ShouldBroadcastNow
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public $roomCode;
    public $playerId;
    public $vote;

    public function __construct(string $roomCode, string $playerId, string $vote)
    {
        $this->roomCode = $roomCode;
        $this->playerId = $playerId;
        $this->vote = $vote;
    }

    public function broadcastOn(): array
    {
        return [
            new Channel('room.' . $this->roomCode),
        ];
    }

    public function broadcastAs(): string
    {
        return 'spy.guess.vote.submitted';
    }

    public function broadcastWith(): array
    {
        return [
            'roomCode' => $this->roomCode,
            'playerId' => $this->playerId,
            'vote' => $this->vote,
        ];
    }
}
