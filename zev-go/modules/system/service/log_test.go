package service

import (
	"testing"
)

func TestSanitizeCSVCell(t *testing.T) {
	cases := []struct {
		in   string
		want string
	}{
		{"normal", "normal"},
		{"=cmd|'/C calc'!A0", "'=cmd|'/C calc'!A0"},
		{"+SUM(A1:A2)", "'+SUM(A1:A2)"},
		{"-100+200", "'-100+200"},
		{"@IMPORTXML", "'@IMPORTXML"},
		{"\tmalicious", "'\tmalicious"},
		{"", ""},
	}
	for _, tc := range cases {
		if got := sanitizeCSVCell(tc.in); got != tc.want {
			t.Fatalf("sanitizeCSVCell(%q) = %q, want %q", tc.in, got, tc.want)
		}
	}
}

func TestParseFilterTime(t *testing.T) {
	start, err := parseFilterTime("2026-11-24", false)
	if err != nil || start == nil {
		t.Fatalf("expected valid start date, got (%v, %v)", start, err)
	}
	end, err := parseFilterTime("2026-11-24", true)
	if err != nil || end == nil {
		t.Fatalf("expected valid end date, got (%v, %v)", end, err)
	}
	if !end.After(*start) || end.Hour() != 23 || end.Minute() != 59 || end.Second() != 59 {
		t.Fatalf("expected endOfDay 23:59:59, got %v", end)
	}

	if _, err := parseFilterTime("invalid-date", false); err == nil {
		t.Fatalf("expected error on invalid date")
	}
}
