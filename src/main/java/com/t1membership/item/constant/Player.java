package com.t1membership.item.constant;

public enum Player {
    FAKER("Faker"),
    DORAN("Doran"),
    ONER("Oner"),
    GUMAYUSI("Gumayusi"),
    KERIA("Keria"),
    SMASH("Smash");

    private final String PlayerName;

    Player(String PlayerName) {
        this.PlayerName = PlayerName;
    }

    public String playerName() {
        return PlayerName;
    }
}
