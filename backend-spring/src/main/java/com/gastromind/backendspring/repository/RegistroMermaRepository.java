package com.gastromind.backendspring.repository;

import com.gastromind.backendspring.entity.RegistroMerma;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface RegistroMermaRepository extends JpaRepository<RegistroMerma, Long> {
}
