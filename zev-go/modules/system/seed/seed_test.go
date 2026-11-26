package seed

import (
	"encoding/json"
	"os"
	"path/filepath"
	"testing"

	"zev-go/modules"
)

func TestModularSeedManifestsAndRegistration(t *testing.T) {
	// 验证 system 排序始终优先于其他模块
	modules.RegisterSeed("zebra", "modules/zebra/seed/seed.json")
	modules.RegisterSeed("system", "modules/system/seed/seed.json")
	modules.RegisterSeed("agent", "modules/agent/seed/seed.json")

	registered := modules.RegisteredSeeds()
	if len(registered) < 3 || registered[0].Module != "system" {
		t.Fatalf("expected system seed to be first, got %+v", registered)
	}

	paths := []string{
		filepath.Join("..", "seed", "seed.json"),
		filepath.Join("..", "..", "agent", "seed", "seed.json"),
	}
	seenMenuIDs := make(map[uint]string)
	for _, p := range paths {
		raw, err := os.ReadFile(p)
		if err != nil {
			t.Fatalf("read %s failed: %v", p, err)
		}
		var data SeedData
		if err := json.Unmarshal(raw, &data); err != nil {
			t.Fatalf("unmarshal %s failed: %v", p, err)
		}
		if len(data.Menus) == 0 {
			t.Fatalf("expected menus in %s", p)
		}
		for _, m := range data.Menus {
			if prev, dup := seenMenuIDs[m.ID]; dup {
				t.Fatalf("duplicate menu id %d between %s and %s", m.ID, prev, p)
			}
			seenMenuIDs[m.ID] = p
			if m.Type == "C" && m.Component == "" {
				t.Fatalf("page menu %d (%s) in %s missing component", m.ID, m.Name, p)
			}
		}
	}
}
