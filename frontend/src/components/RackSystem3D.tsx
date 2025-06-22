import React from 'react'
import { Group, Rect, Line, Text } from 'react-konva'
import { RackSystem, PlanogramSettings } from '../types'

interface RackSystem3DProps {
  rack: RackSystem
  settings: PlanogramSettings
  x: number
  y: number
  isSelected?: boolean
  onClick?: () => void
}

export default function RackSystem3D({ 
  rack, 
  settings, 
  x, 
  y, 
  isSelected, 
  onClick 
}: RackSystem3DProps) {
  const mmToPixels = (mm: number) => mm * settings.pixelsPerMm
  
  const rackWidth = mmToPixels(rack.width)
  const rackHeight = mmToPixels(rack.height)
  const rackDepth = mmToPixels(rack.depth)
  
  // 3D offset для создания глубины
  const depthOffset = Math.min(rackDepth * 0.3, 40)
  
  // Цвета для разных типов стеллажей
  const rackColors = {
    gondola: '#6B7280',
    wall: '#9CA3AF',
    endcap: '#4B5563',
    island: '#374151'
  }
  
  const baseColor = rackColors[rack.type] || '#6B7280'
  const sideColor = '#4B5563'
  const topColor = '#9CA3AF'
  
  return (
    <Group
      x={x}
      y={y}
      onClick={onClick}
    >
      {/* Задняя стенка (если нужна) */}
      {(rack.type === 'wall' || rack.type === 'endcap') && (
        <Rect
          x={depthOffset}
          y={0}
          width={rackWidth}
          height={rackHeight}
          fill={baseColor}
          stroke={isSelected ? '#3B82F6' : '#374151'}
          strokeWidth={isSelected ? 2 : 1}
          opacity={0.8}
        />
      )}
      
      {/* Передняя панель */}
      <Rect
        x={0}
        y={0}
        width={rackWidth}
        height={rackHeight}
        fill={baseColor}
        stroke={isSelected ? '#3B82F6' : '#374151'}
        strokeWidth={isSelected ? 2 : 1}
      />
      
      {/* Боковая панель для 3D эффекта */}
      <Group>
        <Line
          points={[rackWidth, 0, rackWidth + depthOffset, -depthOffset]}
          stroke={sideColor}
          strokeWidth={1}
          fill={sideColor}
        />
        <Line
          points={[rackWidth + depthOffset, -depthOffset, rackWidth + depthOffset, rackHeight - depthOffset]}
          stroke={sideColor}
          strokeWidth={1}
        />
        <Line
          points={[rackWidth + depthOffset, rackHeight - depthOffset, rackWidth, rackHeight]}
          stroke={sideColor}
          strokeWidth={1}
        />
        <Rect
          x={rackWidth}
          y={0}
          width={depthOffset}
          height={rackHeight}
          fill={sideColor}
          opacity={0.7}
        />
      </Group>
      
      {/* Верхняя панель для 3D эффекта */}
      <Group>
        <Line
          points={[0, 0, depthOffset, -depthOffset]}
          stroke={topColor}
          strokeWidth={1}
        />
        <Line
          points={[depthOffset, -depthOffset, rackWidth + depthOffset, -depthOffset]}
          stroke={topColor}
          strokeWidth={1}
        />
        <Rect
          x={0}
          y={-depthOffset}
          width={rackWidth}
          height={depthOffset}
          fill={topColor}
          opacity={0.8}
        />
      </Group>
      
      {/* Полки */}
      {Array.from({ length: rack.levels }, (_, level) => {
        const shelfY = (rackHeight / (rack.levels + 1)) * (level + 1) + 20
        const shelfThickness = 8
        
        return (
          <Group key={`shelf-${level}`}>
            {/* Полка */}
            <Rect
              x={5}
              y={shelfY}
              width={rackWidth - 10}
              height={shelfThickness}
              fill='#D1D5DB'
              stroke='#9CA3AF'
              strokeWidth={1}
              cornerRadius={2}
            />
            
            {/* 3D эффект полки */}
            {settings.show3D && (
              <Rect
                x={7}
                y={shelfY + 2}
                width={rackWidth - 10}
                height={shelfThickness}
                fill='#9CA3AF'
                opacity={0.3}
                cornerRadius={2}
              />
            )}
            
            {/* Номер уровня */}
            <Text
              x={10}
              y={shelfY - 15}
              text={`Ур.${level + 1}`}
              fontSize={8}
              fill='#6B7280'
            />
            
            {/* Размеры полки */}
            {settings.showDimensions && level === 0 && (
              <Text
                x={rackWidth + 10}
                y={shelfY - 5}
                text={`${rack.width}×${rack.depth}мм`}
                fontSize={10}
                fill='#6B7280'
              />
            )}
          </Group>
        )
      })}
      
      {/* Название стеллажа */}
      <Text
        x={rackWidth / 2}
        y={rackHeight + 10}
        text={rack.name}
        fontSize={12}
        fill='#374151'
        align='center'
        width={rackWidth}
      />
      
      {/* Размеры стеллажа */}
      {settings.showDimensions && (
        <Group>
          <Text
            x={-30}
            y={rackHeight / 2}
            text={`${rack.height}мм`}
            fontSize={10}
            fill='#6B7280'
            rotation={-90}
          />
          <Text
            x={rackWidth / 2}
            y={-20}
            text={`${rack.width}мм`}
            fontSize={10}
            fill='#6B7280'
            align='center'
            width={rackWidth}
          />
        </Group>
      )}
    </Group>
  )
} 