package crypto

import "testing"

func TestEncryptDecryptAndMask(t *testing.T) {
	plain := "sk-proj-1234567890abcdef"
	enc, err := Encrypt(plain, "unit-test-secret")
	if err != nil {
		t.Fatalf("Encrypt failed: %v", err)
	}
	if enc == plain || enc == "" {
		t.Fatalf("expected encrypted ciphertext, got %q", enc)
	}
	dec, err := Decrypt(enc, "unit-test-secret")
	if err != nil || dec != plain {
		t.Fatalf("Decrypt mismatch: got %q err=%v", dec, err)
	}
	if _, err := Decrypt(enc, "wrong-secret"); err == nil {
		t.Fatal("expected error with wrong secret")
	}
	if got := MaskSecret(plain); got != "sk-p****cdef" {
		t.Fatalf("unexpected mask: %q", got)
	}
	if got := MaskSecret("short"); got != "****" {
		t.Fatalf("unexpected short mask: %q", got)
	}
}

func TestValidateProductionSecret(t *testing.T) {
	t.Setenv("GIN_MODE", "release")
	t.Setenv("AGENT_SECRET_KEY", "")
	t.Setenv("JWT_SECRET", defaultJWTDevSecret)
	if err := ValidateProductionSecret(); err == nil {
		t.Fatal("expected error in release mode without explicit secret")
	}

	t.Setenv("AGENT_SECRET_KEY", "prod-custom-32-byte-secret-key")
	if err := ValidateProductionSecret(); err != nil {
		t.Fatalf("expected nil with AGENT_SECRET_KEY, got %v", err)
	}
}
