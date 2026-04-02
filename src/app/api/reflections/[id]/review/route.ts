import { NextResponse } from 'next/server'
import { updateReflectionStatus } from '@/server/db/conversations'
import { prisma } from '@/server/db/prisma'

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  try {
    const reflectionId = Number(params.id)
    if (Number.isNaN(reflectionId)) {
      return NextResponse.json(
        { ok: false, error: 'Invalid reflection ID' },
        { status: 400 }
      )
    }

    const body = await request.json()
    const { status } = body

    const validStatuses = ['NEW', 'REVIEWED', 'APPROVED', 'REJECTED']
    if (!validStatuses.includes(status)) {
      return NextResponse.json(
        { ok: false, error: 'Invalid status. Must be NEW, REVIEWED, APPROVED, or REJECTED' },
        { status: 400 }
      )
    }

    // Check if reflection exists
    const reflection = await prisma.reflectionRecord.findUnique({
      where: { id: reflectionId },
    })

    if (!reflection) {
      return NextResponse.json(
        { ok: false, error: 'Reflection not found' },
        { status: 404 }
      )
    }

    // Update status
    const updated = await updateReflectionStatus(
      reflectionId,
      status as 'NEW' | 'REVIEWED' | 'APPROVED' | 'REJECTED'
    )

    return NextResponse.json({
      ok: true,
      data: updated,
    })
  } catch (error) {
    console.error('Error updating reflection status:', error)
    return NextResponse.json(
      { ok: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
