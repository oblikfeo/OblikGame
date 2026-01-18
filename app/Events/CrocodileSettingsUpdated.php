<?php

namespace App\Events;

use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class CrocodileSettingsUpdated implements ShouldBroadcastNow
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public $roomCode;
    public $settings;

    public function __construct(string $roomCode, array $settings)
    {
        $this->roomCode = $roomCode;
        $this->settings = $settings;
    }

    public function broadcastOn(): array
    {
        return [
            new Channel('room.' . $this->roomCode),
        ];
    }

    public function broadcastAs(): string
    {
        return 'crocodile.settings.updated';
    }

    public function broadcastWith(): array
    {
        return [
            'roomCode' => $this->roomCode,
            'settings' => $this->settings,
        ];
    }
}
