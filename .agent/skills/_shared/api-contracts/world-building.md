# World-Building API Contracts

This document defines the API contracts between the Renderer and Main processes (IPC) for the new World-Building relationship graph.

## Endpoints

### 1. Create Relation
- **Channel**: `ipcRenderer.invoke('world:createRelation', params)`
- **Request**:
  ```typescript
  {
    projectId: string;
    sourceId: string;
    sourceType: "Character" | "Faction" | "Event" | "Term";
    targetId: string;
    targetType: "Character" | "Faction" | "Event" | "Term";
    relation: "belongs_to" | "enemy_of" | "causes" | "controls" | "located_in" | "violates";
    attributes?: Record<string, any>;
  }
  ```
- **Response**: `{ success: boolean, data: EntityRelation }`

### 2. Update Relation
- **Channel**: `ipcRenderer.invoke('world:updateRelation', params)`
- **Request**:
  ```typescript
  {
    id: string; // EntityRelation ID
    relation?: "belongs_to" | "enemy_of" | "causes" | "controls" | "located_in" | "violates";
    attributes?: Record<string, any>;
  }
  ```
- **Response**: `{ success: boolean, data: EntityRelation }`

### 3. Delete Relation
- **Channel**: `ipcRenderer.invoke('world:deleteRelation', id)`
- **Request**: `string` (EntityRelation ID)
- **Response**: `{ success: boolean }`

### 4. Get World Graph Data
- **Channel**: `ipcRenderer.invoke('world:getGraph', projectId)`
- **Request**: `string` (Project ID)
- **Response**: 
  ```typescript
  {
    success: boolean,
    data: {
      nodes: Array<{ id: string, type: string, name: string, data: any }>;
      edges: Array<EntityRelation>;
    }
  }
  ```

## Attributes Standard
- **time**: number | string (for timeline sorting)
- **region**: string (for map/space hierarchy)
- **tags**: string[] (for custom filtering)
- **importance**: number (1-5, for node sizing and auto-arrange weight)
