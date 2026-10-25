import { memo } from 'react'
import PropTypes from 'prop-types'
import CanvasTable from '../../../../components/CanvasTable/CanvasTable'
import CanvasNodeLayer from '../CanvasNodeLayer'
import styles from './CanvasWorld.module.css'

/**
 * 世界层：随视口平移 + 缩放的容器
 * - 连线层 + 节点层（CanvasNodeLayer）
 * - 表格层（Excel 风格，逐张渲染 CanvasTable）
 * 纯展示组件：几何与交互全部由上层编排（CanvasPage）传入。
 */
function CanvasWorld({
  view,
  nodes,
  tables,
  edgeViews,
  previewPath,
  selectedIds,
  selectedId,
  editingId,
  draft,
  scale,
  drag,
  selection,
  doc,
  commitNodeEdit,
}) {
  return (
    <div
      className={styles.world}
      style={{
        transform: `translate3d(${view.x}px, ${view.y}px, 0) scale(${view.scale})`,
      }}
    >
      {/* 连线层 + 节点层 */}
      <CanvasNodeLayer
        nodes={nodes}
        edgeViews={edgeViews}
        previewPath={previewPath}
        selectedIds={selectedIds}
        selectedId={selectedId}
        editingId={editingId}
        editingField={selection.editingField}
        draft={draft}
        scale={scale}
        onNodePointerDown={drag.onNodePointerDown}
        onStartEdit={selection.startEditNode}
        onDraftChange={selection.setDraft}
        onCommitEdit={commitNodeEdit}
        onCancelEdit={selection.stopEditing}
        onNodeSizeChange={doc.updateNodeSize}
      />

      {/* 表格层（Excel 风格） */}
      {tables.map((table) => (
        <CanvasTable
          key={table.id}
          table={table}
          selected={table.id === selectedId || selectedIds.includes(table.id)}
          primary={table.id === selectedId}
          onPointerDown={drag.onTablePointerDown}
          onActivate={selection.selectOnly}
          onCellChange={doc.updateTableCell}
          onClearCells={doc.clearTableCells}
          onPasteCells={doc.pasteTableCells}
          onResizeCol={doc.resizeTableCol}
          onResizeRow={doc.resizeTableRow}
          scale={scale}
        />
      ))}
    </div>
  )
}

CanvasWorld.propTypes = {
  view: PropTypes.shape({
    x: PropTypes.number.isRequired,
    y: PropTypes.number.isRequired,
    scale: PropTypes.number.isRequired,
  }).isRequired,
  nodes: PropTypes.array.isRequired,
  tables: PropTypes.array.isRequired,
  edgeViews: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string.isRequired,
      d: PropTypes.string.isRequired,
    }),
  ).isRequired,
  previewPath: PropTypes.string,
  selectedIds: PropTypes.arrayOf(PropTypes.string).isRequired,
  selectedId: PropTypes.string,
  editingId: PropTypes.string,
  draft: PropTypes.string,
  scale: PropTypes.number.isRequired,
  drag: PropTypes.object.isRequired,
  selection: PropTypes.object.isRequired,
  doc: PropTypes.object.isRequired,
  commitNodeEdit: PropTypes.func.isRequired,
}

export default memo(CanvasWorld)
