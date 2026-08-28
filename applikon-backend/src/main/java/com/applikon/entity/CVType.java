package com.applikon.entity;

public enum CVType {
    FILE,   // PDF file uploaded to the application
    LINK,   // Link to an external service (Google Drive, Dropbox)
    NOTE    // Name or label only; file stored locally by the user
}
