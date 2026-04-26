/** Ez a Java fájl a backendhez kapcsolódó logikát és viselkedést tartalmazza. */
package com.royalcruise.backend.repository;

import com.royalcruise.backend.model.Cabin;
import org.springframework.data.jpa.repository.JpaRepository;

// Ez a repository interfesz az adott entitas adatbazis muveleteit (lekerdezes, mentes, torles) definialja.
public interface CabinRepository extends JpaRepository<Cabin, String> {
}
