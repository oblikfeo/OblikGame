<?php

namespace App\Events;

use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class SpyResultsReady implements ShouldBroadcastNow
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public $roomCode;
    public $results;

    public function __construct(string $roomCode, array $results)
    {
        $this->roomCode = $roomCode;
        $this->results = $results;
    }

    public function broadcastOn(): array
    {
        return [
            new Channel('room.' . $this->roomCode),
        ];
    }

    public function broadcastAs(): string
    {
        return 'spy.results.ready';
    }

    public function broadcastWith(): array
    {
        return [
            'roomCode' => $this->roomCode,
            'results' => $this->results,
        ];
    }
}
