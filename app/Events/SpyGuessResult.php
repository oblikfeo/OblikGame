<?php

namespace App\Events;

use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class SpyGuessResult implements ShouldBroadcastNow
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public $roomCode;
    public $result;

    public function __construct(string $roomCode, array $result)
    {
        $this->roomCode = $roomCode;
        $this->result = $result;
    }

    public function broadcastOn(): array
    {
        return [
            new Channel('room.' . $this->roomCode),
        ];
    }

    public function broadcastAs(): string
    {
        return 'spy.guess.result';
    }

    public function broadcastWith(): array
    {
        return [
            'roomCode' => $this->roomCode,
            'result' => $this->result,
        ];
    }
}
