/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { createContext, useContext } from 'react';
import { CorporateEntity } from '../types';

interface EntityContextType {
  currentEntity: CorporateEntity | null;
  currentEntityId: string;
  accessibleEntities: CorporateEntity[];
  isSwitchingEntity: boolean;
  switchEntity: (entityId: string) => Promise<void>;
  refreshCurrentEntity: () => void;
  clearEntityScopedCache: () => void;
  userHasEntityAccess: (entityId: string) => boolean;
}

const EntityContext = createContext<EntityContextType | undefined>(undefined);

export function useEntity() {
  const context = useContext(EntityContext);
  if (!context) {
    throw new Error('useEntity must be used within an EntityContextProvider');
  }
  return context;
}

interface EntityProviderProps {
  children: React.ReactNode;
  entities: CorporateEntity[];
  activeEntityId: string;
  isSwitchingEntity: boolean;
  onSwitchEntity: (entityId: string) => void;
}

export function EntityContextProvider({
  children,
  entities,
  activeEntityId,
  isSwitchingEntity,
  onSwitchEntity
}: EntityProviderProps) {
  const currentEntity = entities.find(e => e.id === activeEntityId) || null;
  const accessibleEntities = entities.filter(e => e.isActive);

  const switchEntity = async (entityId: string) => {
    if (userHasEntityAccess(entityId)) {
      onSwitchEntity(entityId);
    }
  };

  const refreshCurrentEntity = () => {
    console.log('[EntityContext] Refreshing entity settings:', activeEntityId);
  };

  const clearEntityScopedCache = () => {
    console.log('[EntityContext] Clearing scoped caches for entity:', activeEntityId);
  };

  const userHasEntityAccess = (entityId: string) => {
    const ent = entities.find(e => e.id === entityId);
    return !!ent && ent.isActive;
  };

  return (
    <EntityContext.Provider
      value={{
        currentEntity,
        currentEntityId: activeEntityId,
        accessibleEntities,
        isSwitchingEntity,
        switchEntity,
        refreshCurrentEntity,
        clearEntityScopedCache,
        userHasEntityAccess
      }}
    >
      {children}
    </EntityContext.Provider>
  );
}
