import {
  type DocumentActionComponent,
  type DocumentActionsContext,
  useDocumentOperation,
} from "sanity";
import { useCallback, useState } from "react";

function SubmitForReviewAction(
  props: Parameters<DocumentActionComponent>[0]
): ReturnType<DocumentActionComponent> {
  const { patch, publish } = useDocumentOperation(props.id, props.type);
  const [isRunning, setIsRunning] = useState(false);

  const status = props.draft?.editorialStatus || props.published?.editorialStatus;

  return {
    label: "Submit for Review",
    disabled: status !== "draft" || isRunning,
    onHandle: useCallback(async () => {
      setIsRunning(true);
      patch.execute([{ set: { editorialStatus: "in_review" } }]);
      publish.execute();
      props.onComplete();
    }, [patch, publish, props]),
  };
}

function ApproveAndPublishAction(
  props: Parameters<DocumentActionComponent>[0]
): ReturnType<DocumentActionComponent> {
  const { patch, publish } = useDocumentOperation(props.id, props.type);
  const [isRunning, setIsRunning] = useState(false);

  const status = props.draft?.editorialStatus || props.published?.editorialStatus;

  return {
    label: "Approve & Publish",
    disabled: status !== "in_review" || isRunning,
    tone: "positive",
    onHandle: useCallback(async () => {
      setIsRunning(true);
      const updates: Record<string, unknown> = {
        editorialStatus: "published",
      };
      // Auto-set publishedAt if not already set
      const existing =
        props.draft?.publishedAt || props.published?.publishedAt;
      if (!existing) {
        updates.publishedAt = new Date().toISOString();
      }
      patch.execute([{ set: updates }]);
      publish.execute();
      props.onComplete();
    }, [patch, publish, props]),
  };
}

function RequestChangesAction(
  props: Parameters<DocumentActionComponent>[0]
): ReturnType<DocumentActionComponent> {
  const { patch, publish } = useDocumentOperation(props.id, props.type);
  const [isRunning, setIsRunning] = useState(false);

  const status = props.draft?.editorialStatus || props.published?.editorialStatus;

  return {
    label: "Request Changes",
    disabled: status !== "in_review" || isRunning,
    tone: "caution",
    onHandle: useCallback(async () => {
      setIsRunning(true);
      patch.execute([{ set: { editorialStatus: "draft" } }]);
      publish.execute();
      props.onComplete();
    }, [patch, publish, props]),
  };
}

const SINGLETON_TYPES = new Set(["siteSettings", "landingPage", "tripBuilderConfig", "pagesContent"]);

export function resolveDocumentActions(
  prev: DocumentActionComponent[],
  context: DocumentActionsContext
): DocumentActionComponent[] {
  if (context.schemaType === "guide" || context.schemaType === "experience") {
    return [
      SubmitForReviewAction,
      ApproveAndPublishAction,
      RequestChangesAction,
      // Keep delete action from defaults
      ...prev.filter(
        (action) => action.action === "delete" || action.action === "duplicate"
      ),
    ];
  }

  // Singletons: only publish, no delete or duplicate
  if (SINGLETON_TYPES.has(context.schemaType)) {
    return prev.filter(
      (action) => action.action === "publish" || action.action === "discardChanges"
    );
  }

  return prev;
}
