import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type FileDocument = FileMetadata & Document;

@Schema({ timestamps: true })
export class FileMetadata {
  @Prop({ required: true })
  filename: string;

  @Prop({ required: true })
  originalName: string;

  @Prop({ required: true })
  mimeType: string;

  @Prop({ required: true })
  size: number;

  @Prop({ required: true })
  storagePath: string;

  @Prop({ required: true, type: Types.ObjectId, ref: 'User' })
  uploadedBy: Types.ObjectId;

  @Prop()
  description?: string;

  @Prop({ type: [String], default: [] })
  tags: string[];

  @Prop({ default: false })
  isPublic: boolean;

  @Prop({ default: 0 })
  downloadCount: number;

  @Prop()
  lastAccessedAt?: Date;
}

export const FileMetadataSchema = SchemaFactory.createForClass(FileMetadata);

FileMetadataSchema.index({ filename: 1 });
FileMetadataSchema.index({ uploadedBy: 1 });
FileMetadataSchema.index({ mimeType: 1 });
FileMetadataSchema.index({ tags: 1 });
FileMetadataSchema.index({ createdAt: -1 });
