/** Ez a Java fájl a backendhez kapcsolódó logikát és viselkedést tartalmazza. */
package com.royalcruise.backend.repository;

import com.royalcruise.backend.model.Booking;
import com.royalcruise.backend.model.UserAccount;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

// Ez a repository interfesz az adott entitas adatbazis muveleteit (lekerdezes, mentes, torles) definialja.
public interface BookingRepository extends JpaRepository<Booking, Long> {
    List<Booking> findByUserOrderByCreatedAtDesc(UserAccount user);

    @Query("SELECT b FROM Booking b JOIN FETCH b.user ORDER BY b.createdAt DESC")
    List<Booking> findAllByOrderByCreatedAtDesc();

    @Modifying
    @Transactional
    @Query("DELETE FROM Booking b WHERE b.user = :user")
    void deleteByUser(UserAccount user);
}
